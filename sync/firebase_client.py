"""
Firebase initialisation and batch-write helper.
"""

import os
import sys

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BATCH_SIZE = 500  # Firestore batch write limit

# ---------------------------------------------------------------------------
# Firebase initialisation (lazy — only done when a command needs it)
# ---------------------------------------------------------------------------

_db = None


def get_db():
    global _db
    if _db is not None:
        return _db

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as fs
    except ImportError:
        print("ERROR: firebase-admin is not installed. Run: uv sync")
        sys.exit(1)

    service_account_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "./serviceAccount.json")
    if not os.path.exists(service_account_path):
        print(
            f"ERROR: Firebase service account file not found at '{service_account_path}'.\n"
            "Download it from the Firebase console → Project settings → Service accounts."
        )
        sys.exit(1)

    try:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        _db = fs.client()
        print(f"Connected to Firestore using service account: {service_account_path}")
    except Exception as exc:
        print(f"ERROR: Failed to initialise Firebase: {exc}")
        sys.exit(1)

    return _db


# ---------------------------------------------------------------------------
# Batch-write helper
# ---------------------------------------------------------------------------

def commit_batches(db, operations: list[tuple]) -> tuple[int, int]:
    """
    operations: list of (doc_ref, data, merge) tuples.
    Returns (created_count, updated_count) — approximated by checking existing docs.
    Commits in chunks of BATCH_SIZE.
    """
    from firebase_admin import firestore as fs

    created = 0
    updated = 0

    # Determine which docs already exist so we can report created vs updated
    doc_refs = [op[0] for op in operations]
    existing_ids: set[str] = set()
    # Firestore getAll supports up to 500 docs at a time
    for i in range(0, len(doc_refs), BATCH_SIZE):
        chunk_refs = doc_refs[i : i + BATCH_SIZE]
        snapshots = db.get_all(chunk_refs)
        for snap in snapshots:
            if snap.exists:
                existing_ids.add(snap.id)

    # Write in batches
    for i in range(0, len(operations), BATCH_SIZE):
        batch = db.batch()
        chunk = operations[i : i + BATCH_SIZE]
        for doc_ref, data, merge in chunk:
            batch.set(doc_ref, data, merge=merge)
            if doc_ref.id in existing_ids:
                updated += 1
            else:
                created += 1
        batch.commit()

    return created, updated
