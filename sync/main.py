#!/usr/bin/env python3
"""
FIFA World Cup 2026 Prediction App - Data Sync CLI
"""

import sys
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

from espn import fetch_events, fetch_finished_matches, fetch_team_logos
from firebase_client import get_db, commit_batches, BATCH_SIZE
from scoring import calculate_points


# All remaining knockout stage date strings (YYYYMMDD).
# ESPN groups late-night UTC events under the previous broadcast day, so we
# include one extra date on each end and deduplicate inside fetch_events.
KNOCKOUT_DATES = [
    "20260628", "20260629", "20260630",
    "20260701", "20260702", "20260703", "20260704",
    "20260705", "20260706", "20260707", "20260708",
    "20260709", "20260710", "20260711", "20260712",
    "20260714", "20260715",
    "20260718", "20260719",
]


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

def cmd_sync_fixtures():
    """
    Fetch all knockout-stage fixtures from ESPN and update Firestore with the
    correct team names, logos, and stage. Creates missing docs (e.g. third-place
    match). Run whenever team assignments change (best-thirds, etc.).
    """
    print("Fetching knockout fixtures from ESPN …")
    events = fetch_events(KNOCKOUT_DATES)
    knockout = [e for e in events if e["stage"] in (
        "round_of_32", "round_of_16", "quarterfinal", "semifinal", "third_place", "final"
    )]

    if not knockout:
        print("No knockout events returned. Nothing to update.")
        return

    print(f"Received {len(knockout)} knockout event(s) from ESPN.")

    db = get_db()
    matches_col = db.collection("matches")

    operations = []
    created = 0

    for event in knockout:
        docs = list(
            matches_col.where("matchDate", "==", event["event_dt"]).limit(1).stream()
        )

        update: dict = {
            "homeTeam": event["home_team"],
            "awayTeam": event["away_team"],
            "homeTeamFlag": event["home_logo"] or "🏳️",
            "awayTeamFlag": event["away_logo"] or "🏳️",
            "stage": event["stage"],
        }

        if docs:
            operations.append((docs[0].reference, update, True))
        else:
            # Doc missing — create it (e.g. third-place match)
            dt: datetime = event["event_dt"]
            doc_id = f"espn_{dt.strftime('%Y%m%d_%H%M')}"
            update["matchDate"] = dt
            update["externalId"] = doc_id
            update["status"] = "upcoming"
            update["group"] = None
            operations.append((matches_col.document(doc_id), update, False))
            created += 1
            print(f"  Creating missing doc: {event['home_team']} vs {event['away_team']} ({dt})")

    print(f"Writing {len(operations)} update(s) ({created} new, {len(operations) - created} updated) …")
    commit_batches(db, operations)
    print(f"Done. Synced {len(operations)} fixture(s).")


def cmd_sync_results():
    """
    Fetch finished matches from ESPN (yesterday + today) and update Firestore.
    Matches by UTC timestamp, so team names and logos are also kept current —
    useful for knockout matches where teams were previously TBD.
    """
    print("Fetching finished matches from ESPN …")
    finished = fetch_finished_matches()

    if not finished:
        print("No finished matches found yet. Nothing to update.")
        return

    print(f"Found {len(finished)} finished match(es).")

    db = get_db()
    matches_col = db.collection("matches")

    operations = []
    for event in finished:
        docs = list(
            matches_col.where("matchDate", "==", event["event_dt"]).limit(1).stream()
        )
        if not docs:
            print(
                f"WARNING: No Firestore doc for "
                f"{event['home_team']} vs {event['away_team']} at {event['event_dt']}"
            )
            continue

        existing = docs[0].to_dict()
        update: dict = {
            # Keep team names/logos current (resolves TBD knockout slots)
            "homeTeam": event["home_team"],
            "awayTeam": event["away_team"],
            "homeTeamFlag": event["home_logo"] or existing.get("homeTeamFlag", "🏳️"),
            "awayTeamFlag": event["away_logo"] or existing.get("awayTeamFlag", "🏳️"),
            "homeScore": event["home_score"],
            "awayScore": event["away_score"],
            "status": "finished",
        }
        operations.append((docs[0].reference, update, True))

    print(f"Updating {len(operations)} match result(s) in Firestore …")
    for i in range(0, len(operations), BATCH_SIZE):
        db_batch = db.batch()
        for doc_ref, data, merge in operations[i : i + BATCH_SIZE]:
            db_batch.set(doc_ref, data, merge=merge)
        db_batch.commit()

    print(f"Updated {len(operations)} match result(s).")


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

    print(f"Processed {total_processed} prediction(s), updated {len(user_ops)} user score(s).")


def cmd_sync_logos():
    """
    Fetch team logo URLs from ESPN for all match dates and update homeTeamFlag/awayTeamFlag
    in every Firestore match document.
    """
    db = get_db()
    matches_col = db.collection("matches")

    all_matches = list(matches_col.stream())
    date_strs = sorted({
        snap.to_dict()["matchDate"].strftime("%Y%m%d")
        for snap in all_matches
        if snap.to_dict().get("matchDate")
    })

    print(f"Fetching logos from ESPN for {len(date_strs)} date(s) …")
    logos = fetch_team_logos(date_strs)
    print(f"Found logos for {len(logos)} team(s).")

    operations = []
    missing: set[str] = set()
    for snap in all_matches:
        m = snap.to_dict()
        home, away = m.get("homeTeam", ""), m.get("awayTeam", "")
        updates: dict = {}
        if home in logos:
            updates["homeTeamFlag"] = logos[home]
        else:
            missing.add(home)
        if away in logos:
            updates["awayTeamFlag"] = logos[away]
        else:
            missing.add(away)
        if updates:
            operations.append((snap.reference, updates, True))

    if missing:
        print(f"WARNING: No logo found for: {', '.join(sorted(missing))}")

    print(f"Updating {len(operations)} match document(s) …")
    for i in range(0, len(operations), BATCH_SIZE):
        batch = db.batch()
        for ref, data, merge in operations[i : i + BATCH_SIZE]:
            batch.set(ref, data, merge=merge)
        batch.commit()
    print(f"Updated {len(operations)} match document(s).")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

COMMANDS = {
    "sync-fixtures": cmd_sync_fixtures,
    "sync-results": cmd_sync_results,
    "process-scores": cmd_process_scores,
    "sync-logos": cmd_sync_logos,
}

USAGE = """\
Usage: uv run python main.py <command>

Commands:
  sync-fixtures   Fetch knockout-stage fixtures from ESPN and update team names,
                  logos, and stages in Firestore. Run whenever new teams are
                  confirmed (e.g. best-thirds finalized, bracket advances).

  sync-results    Fetch finished matches from ESPN (yesterday + today) and update
                  scores, status, and team info in Firestore. Run daily after
                  match days. Also resolves previously-TBD team names.

  process-scores  Calculate prediction points for every finished match and
                  recompute totalScore for every user. Idempotent.

  sync-logos      (Legacy) Bulk-update team logo URLs from ESPN for all dates.
                  sync-fixtures and sync-results now keep logos current.
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
