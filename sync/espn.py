"""
ESPN unofficial scoreboard API: fetch World Cup match data.
No API key required.
"""

from datetime import datetime, timezone, timedelta

import requests

SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"

# ESPN season.slug → Firestore stage value
ESPN_SLUG_TO_STAGE: dict[str, str] = {
    "round-of-32": "round_of_32",
    "round-of-16": "round_of_16",
    "quarterfinals": "quarterfinal",
    "semifinals": "semifinal",
    "3rd-place-match": "third_place",
    "final": "final",
}


def parse_espn_datetime(dt_str: str) -> datetime:
    """Parse ESPN date strings like '2026-06-28T19:00Z' into a UTC datetime."""
    for fmt in ("%Y-%m-%dT%H:%MZ", "%Y-%m-%dT%H:%M:%SZ"):
        try:
            return datetime.strptime(dt_str, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse ESPN datetime: {dt_str!r}")


def fetch_events(date_strs: list[str]) -> list[dict]:
    """
    Fetch all match events from ESPN for the given date strings (YYYYMMDD).
    Returns a list of dicts with full event info. Deduplicates by UTC datetime.
    """
    seen_dts: set[datetime] = set()
    events_out: list[dict] = []

    for date in date_strs:
        try:
            resp = requests.get(SCOREBOARD_URL, params={"dates": date}, timeout=30)
            resp.raise_for_status()
        except requests.exceptions.RequestException as exc:
            print(f"WARNING: Could not fetch ESPN data for {date}: {exc}")
            continue

        for event in resp.json().get("events", []):
            dt_str = event.get("date", "")
            if not dt_str:
                continue
            event_dt = parse_espn_datetime(dt_str)
            if event_dt in seen_dts:
                continue
            seen_dts.add(event_dt)

            competition = event.get("competitions", [{}])[0]
            competitors = competition.get("competitors", [])
            home = next((c for c in competitors if c.get("homeAway") == "home"), None)
            away = next((c for c in competitors if c.get("homeAway") == "away"), None)
            if not home or not away:
                continue

            slug = event.get("season", {}).get("slug", "")
            completed = event.get("status", {}).get("type", {}).get("completed", False)

            events_out.append({
                "event_dt": event_dt,
                "slug": slug,
                "stage": ESPN_SLUG_TO_STAGE.get(slug),
                "completed": completed,
                "home_team": home["team"]["displayName"],
                "away_team": away["team"]["displayName"],
                "home_logo": home["team"].get("logo", ""),
                "away_logo": away["team"].get("logo", ""),
                "home_score": int(home.get("score", 0)) if completed else None,
                "away_score": int(away.get("score", 0)) if completed else None,
            })

    return events_out


def fetch_team_logos(date_strs: list[str]) -> dict[str, str]:
    """
    Fetch team logo URLs from ESPN for the given dates.
    Returns a dict of team displayName → ESPN logo URL.
    """
    logos: dict[str, str] = {}
    for event in fetch_events(date_strs):
        for key in ("home", "away"):
            name = event[f"{key}_team"]
            logo = event[f"{key}_logo"]
            if logo and name not in logos:
                logos[name] = logo
    return logos


def fetch_finished_matches() -> list[dict]:
    """
    Fetch completed matches from ESPN for yesterday and today (UTC).
    Returns list of event dicts (see fetch_events) filtered to completed ones.
    """
    now = datetime.now(timezone.utc)
    dates = [
        (now - timedelta(days=1)).strftime("%Y%m%d"),
        now.strftime("%Y%m%d"),
    ]
    return [e for e in fetch_events(dates) if e["completed"]]
