#!/usr/bin/env python3
"""
FIFA World Cup 2026 Prediction App - Data Sync CLI
Authoritative data processor: fetches from OpenFootball and writes to Firestore.
"""

import sys
from dotenv import load_dotenv

load_dotenv()

from api_football import fetch_matches, build_match_doc
from firebase_client import get_db, commit_batches, BATCH_SIZE
from scoring import calculate_points


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_sync_matches():
    """Fetch all WC2026 fixtures from OpenFootball and upsert into Firestore /matches."""
    print("Fetching all fixtures from OpenFootball …")
    matches = fetch_matches()

    if not matches:
        print("No fixtures returned. Nothing to sync.")
        return

    print(f"Received {len(matches)} fixtures.")

    db = get_db()
    matches_col = db.collection("matches")

    operations = []
    for match in matches:
        doc_id, doc = build_match_doc(match)
        if not doc_id:
            continue
        operations.append((matches_col.document(doc_id), doc, True))

    if not operations:
        print("No valid fixtures to write.")
        return

    print(f"Writing {len(operations)} matches to Firestore …")
    created, updated = commit_batches(db, operations)
    print(f"Synced {len(operations)} matches ({created} created, {updated} updated)")


def cmd_sync_results():
    """Fetch finished fixtures from OpenFootball and update score/status in Firestore."""
    print("Fetching fixtures from OpenFootball …")
    matches = fetch_matches()

    finished = [m for m in matches if m.get("score1") is not None and m.get("score2") is not None]

    if not finished:
        print("No finished matches found yet. Nothing to update.")
        return

    print(f"Found {len(finished)} finished match(es).")

    db = get_db()
    matches_col = db.collection("matches")

    operations = []
    for match in finished:
        doc_id, full_doc = build_match_doc(match)
        if not doc_id:
            continue
        partial_doc = {
            "homeScore": full_doc["homeScore"],
            "awayScore": full_doc["awayScore"],
            "status": full_doc["status"],
        }
        operations.append((matches_col.document(doc_id), partial_doc, True))

    print(f"Updating {len(operations)} match results in Firestore …")
    for i in range(0, len(operations), BATCH_SIZE):
        db_batch = db.batch()
        for doc_ref, data, merge in operations[i : i + BATCH_SIZE]:
            db_batch.set(doc_ref, data, merge=merge)
        db_batch.commit()

    print(f"Updated {len(operations)} match results")


def cmd_process_scores():
    """
    For every finished match, calculate prediction points and recompute user totals.
    Idempotent — safe to run multiple times.
    """
    db = get_db()
    matches_col = db.collection("matches")
    predictions_col = db.collection("predictions")
    users_col = db.collection("users")

    print("Fetching finished matches from Firestore …")
    finished_matches = {
        snap.id: snap.to_dict()
        for snap in matches_col.where("status", "==", "finished").stream()
    }

    if not finished_matches:
        print("No finished matches in Firestore. Run sync-results first.")
        return

    print(f"Found {len(finished_matches)} finished match(es).")

    prediction_ops: list[tuple] = []
    total_processed = 0

    for match_id, match_data in finished_matches.items():
        for snap in predictions_col.where("matchId", "==", match_id).stream():
            points = calculate_points(match_data, snap.to_dict())
            prediction_ops.append((predictions_col.document(snap.id), {"points": points}, True))
            total_processed += 1

    if prediction_ops:
        print(f"Writing points to {len(prediction_ops)} prediction(s) …")
        for i in range(0, len(prediction_ops), BATCH_SIZE):
            db_batch = db.batch()
            for doc_ref, data, merge in prediction_ops[i : i + BATCH_SIZE]:
                db_batch.set(doc_ref, data, merge=merge)
            db_batch.commit()

    # Recompute totalScore for every user from scratch (idempotent)
    print("Recomputing user totals …")
    user_totals: dict[str, int] = {}
    for snap in predictions_col.stream():
        pred = snap.to_dict()
        uid = pred.get("userId")
        if uid and pred.get("points") is not None:
            user_totals[uid] = user_totals.get(uid, 0) + pred["points"]

    user_ops = [
        (users_col.document(uid), {"totalScore": total}, True)
        for uid, total in user_totals.items()
    ]
    if user_ops:
        for i in range(0, len(user_ops), BATCH_SIZE):
            db_batch = db.batch()
            for doc_ref, data, merge in user_ops[i : i + BATCH_SIZE]:
                db_batch.set(doc_ref, data, merge=merge)
            db_batch.commit()

    print(f"Processed {total_processed} prediction(s), updated {len(user_ops)} user score(s)")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

COMMANDS = {
    "sync-matches": cmd_sync_matches,
    "sync-results": cmd_sync_results,
    "process-scores": cmd_process_scores,
}

USAGE = """\
Usage: uv run python main.py <command>

Commands:
  sync-matches    Fetch all WC2026 fixtures from OpenFootball and upsert into
                  Firestore /matches. Run once before the tournament.

  sync-results    Fetch finished matches and update scores/status in Firestore.
                  Run daily after match days.

  process-scores  Calculate prediction points for every finished match and
                  recompute totalScore for every user. Idempotent.
"""


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(USAGE)
        sys.exit(0 if len(sys.argv) == 1 else 1)

    command = sys.argv[1]
    print(f"=== Running: {command} ===\n")
    try:
        COMMANDS[command]()
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(1)
    print("\nDone.")


if __name__ == "__main__":
    main()
