#!/usr/bin/env python3
"""
FIFA World Cup 2026 Prediction App - Data Sync CLI
"""

import sys
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv

load_dotenv()

from espn import fetch_events, fetch_finished_matches, fetch_team_logos, fetch_top_scorers
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
    claimed_ids: set[str] = set()

    # Pass 1: exact matchDate matches (the common case).
    unmatched = []
    for event in knockout:
        docs = [
            d for d in matches_col.where("matchDate", "==", event["event_dt"]).stream()
            if d.id not in claimed_ids
        ]
        if docs:
            claimed_ids.add(docs[0].id)
            update: dict = {
                "homeTeam": event["home_team"],
                "awayTeam": event["away_team"],
                "homeTeamFlag": event["home_logo"] or "🏳️",
                "awayTeamFlag": event["away_logo"] or "🏳️",
                "stage": event["stage"],
            }
            operations.append((docs[0].reference, update, True))
        else:
            unmatched.append(event)

    # Pass 2: ESPN sometimes reports a different UTC timestamp than what was
    # pre-loaded (e.g. off by an hour due to DST or a schedule change). Before
    # creating a new doc, look for an unclaimed doc in the same stage within a
    # couple hours of the ESPN time and reuse it instead of duplicating the match.
    for event in unmatched:
        update = {
            "homeTeam": event["home_team"],
            "awayTeam": event["away_team"],
            "homeTeamFlag": event["home_logo"] or "🏳️",
            "awayTeamFlag": event["away_logo"] or "🏳️",
            "stage": event["stage"],
        }

        window_start = event["event_dt"] - timedelta(hours=2)
        window_end = event["event_dt"] + timedelta(hours=2)
        nearby = [
            d for d in matches_col.where("stage", "==", event["stage"]).stream()
            if d.id not in claimed_ids
            and window_start <= d.to_dict().get("matchDate") <= window_end
        ]

        target = min(
            nearby, key=lambda d: abs(d.to_dict()["matchDate"] - event["event_dt"])
        ) if nearby else None

        if target:
            claimed_ids.add(target.id)
            print(
                f"INFO: Matched {event['home_team']} vs {event['away_team']} by "
                f"nearby matchDate (ESPN time {event['event_dt']} differed from "
                f"stored matchDate {target.to_dict()['matchDate']})"
            )
            operations.append((target.reference, update, True))
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
        # Multiple matches can share the same matchDate (group stage pairs), so
        # fetch all docs at that time and disambiguate by team name involvement.
        candidates = list(
            matches_col.where("matchDate", "==", event["event_dt"]).stream()
        )
        teams = {event["home_team"], event["away_team"]}
        target = next(
            (d for d in candidates
             if {d.to_dict().get("homeTeam"), d.to_dict().get("awayTeam")} & teams),
            candidates[0] if len(candidates) == 1 else None,
        )

        # Fallback: ESPN sometimes reports a different UTC timestamp than what was
        # pre-loaded (e.g. off by an hour due to DST or data entry). Search by team
        # name among non-finished docs within the same stage.
        if not target:
            by_home = list(matches_col.where("homeTeam", "==", event["home_team"]).stream())
            by_away = list(matches_col.where("awayTeam", "==", event["away_team"]).stream())
            fallback = next(
                (d for d in by_home + by_away
                 if {d.to_dict().get("homeTeam"), d.to_dict().get("awayTeam")} == teams
                 and d.to_dict().get("status") != "finished"),
                None,
            )
            if fallback:
                print(
                    f"INFO: Matched {event['home_team']} vs {event['away_team']} "
                    f"by team name (ESPN time {event['event_dt']} differed from stored matchDate)"
                )
                target = fallback
            else:
                print(
                    f"WARNING: No Firestore doc for "
                    f"{event['home_team']} vs {event['away_team']} at {event['event_dt']}"
                )
                continue

        existing = target.to_dict()
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
        operations.append((target.reference, update, True))

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


def cmd_sync_top_scorers():
    """
    Fetch the tournament-wide goals leaderboard from ESPN and write it to
    Firestore at /stats/topScorers. Run daily so the Goleadores tab stays current.
    """
    print("Fetching top scorers from ESPN …")
    scorers = fetch_top_scorers()

    if not scorers:
        print("No scorer data returned. Nothing to update.")
        return

    print(f"Found {len(scorers)} scorer(s).")

    db = get_db()
    db.collection("stats").document("topScorers").set({
        "players": scorers,
        "updatedAt": datetime.now(timezone.utc),
    })
    print(f"Updated top scorers ({len(scorers)} player(s)).")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

COMMANDS = {
    "sync-fixtures": cmd_sync_fixtures,
    "sync-results": cmd_sync_results,
    "process-scores": cmd_process_scores,
    "sync-logos": cmd_sync_logos,
    "sync-top-scorers": cmd_sync_top_scorers,
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

  sync-top-scorers  Fetch the tournament-wide goals leaderboard from ESPN and
                  write it to Firestore for the Goleadores tab. Run daily.
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
