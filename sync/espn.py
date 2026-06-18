"""
ESPN unofficial scoreboard API: fetch finished World Cup match results.
No API key required.
"""

from datetime import datetime, timezone, timedelta

import requests

SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard"

# ESPN name → OpenFootball name (only entries that differ)
ESPN_TO_OPENFOOTBALL: dict[str, str] = {
    "Czechia": "Czech Republic",
    "IR Iran": "Iran",
    "Korea Republic": "South Korea",
    "United States": "USA",
    "Türkiye": "Turkey",
    "Bosnia-Herzegovina": "Bosnia & Herzegovina",
    "Congo DR": "DR Congo",
}


def _normalize(name: str) -> str:
    return ESPN_TO_OPENFOOTBALL.get(name, name)


def fetch_team_logos(date_strs: list[str]) -> dict[str, str]:
    """
    Fetch team logo URLs from ESPN for the given dates.
    Returns a dict of OpenFootball team name → ESPN logo URL.
    """
    logos: dict[str, str] = {}
    for date in date_strs:
        try:
            resp = requests.get(SCOREBOARD_URL, params={"dates": date}, timeout=30)
            resp.raise_for_status()
        except requests.exceptions.RequestException as exc:
            print(f"WARNING: Could not fetch ESPN data for {date}: {exc}")
            continue
        for event in resp.json().get("events", []):
            competition = event.get("competitions", [{}])[0]
            for c in competition.get("competitors", []):
                name = _normalize(c["team"]["displayName"])
                logo = c["team"].get("logo", "")
                if logo and name not in logos:
                    logos[name] = logo
    return logos


def fetch_finished_matches() -> list[dict]:
    """
    Fetch completed matches from ESPN for yesterday and today (UTC).
    Returns list of dicts: date_str, home_team, away_team, home_score, away_score.
    """
    now = datetime.now(timezone.utc)
    dates = [
        (now - timedelta(days=1)).strftime("%Y%m%d"),
        now.strftime("%Y%m%d"),
    ]

    finished: list[dict] = []
    seen: set[tuple] = set()

    for date in dates:
        try:
            resp = requests.get(SCOREBOARD_URL, params={"dates": date}, timeout=30)
            resp.raise_for_status()
        except requests.exceptions.RequestException as exc:
            print(f"WARNING: Could not fetch ESPN data for {date}: {exc}")
            continue

        for event in resp.json().get("events", []):
            if not event.get("status", {}).get("type", {}).get("completed"):
                continue

            event_date = event.get("date", "")[:10]  # "2026-06-11T19:00Z" → "2026-06-11"
            competition = event.get("competitions", [{}])[0]
            competitors = competition.get("competitors", [])

            home = next((c for c in competitors if c.get("homeAway") == "home"), None)
            away = next((c for c in competitors if c.get("homeAway") == "away"), None)
            if not home or not away:
                continue

            home_team = _normalize(home["team"]["displayName"])
            away_team = _normalize(away["team"]["displayName"])
            key = (event_date, home_team, away_team)
            if key in seen:
                continue
            seen.add(key)

            finished.append({
                "date_str": event_date,
                "home_team": home_team,
                "away_team": away_team,
                "home_score": int(home.get("score", 0)),
                "away_score": int(away.get("score", 0)),
            })

    return finished
