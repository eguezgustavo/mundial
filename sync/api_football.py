"""
OpenFootball data source: fixture fetching, field mapping, stage helpers, FLAG_MAP.
No API key required.
Source: https://github.com/openfootball/worldcup.json
"""

import re
import sys
from datetime import datetime, timezone, timedelta

import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DATA_URL = (
    "https://raw.githubusercontent.com/openfootball/worldcup.json"
    "/master/2026/worldcup.json"
)

FLAG_MAP = {
    "Brazil": "\U0001f1e7\U0001f1f7",
    "Argentina": "\U0001f1e6\U0001f1f7",
    "France": "\U0001f1eb\U0001f1f7",
    "Germany": "\U0001f1e9\U0001f1ea",
    "Spain": "\U0001f1ea\U0001f1f8",
    "England": "\U0001f3f4\U000e0067\U000e0062\U000e0065\U000e006e\U000e0067\U000e007f",
    "Portugal": "\U0001f1f5\U0001f1f9",
    "Netherlands": "\U0001f1f3\U0001f1f1",
    "Belgium": "\U0001f1e7\U0001f1ea",
    "Uruguay": "\U0001f1fa\U0001f1fe",
    "Croatia": "\U0001f1ed\U0001f1f7",
    "Denmark": "\U0001f1e9\U0001f1f0",
    "Switzerland": "\U0001f1e8\U0001f1ed",
    "Mexico": "\U0001f1f2\U0001f1fd",
    "USA": "\U0001f1fa\U0001f1f8",
    "United States": "\U0001f1fa\U0001f1f8",
    "Canada": "\U0001f1e8\U0001f1e6",
    "Japan": "\U0001f1ef\U0001f1f5",
    "South Korea": "\U0001f1f0\U0001f1f7",
    "Australia": "\U0001f1e6\U0001f1fa",
    "Morocco": "\U0001f1f2\U0001f1e6",
    "Senegal": "\U0001f1f8\U0001f1f3",
    "Ghana": "\U0001f1ec\U0001f1ed",
    "Cameroon": "\U0001f1e8\U0001f1f2",
    "Nigeria": "\U0001f1f3\U0001f1ec",
    "Tunisia": "\U0001f1f9\U0001f1f3",
    "Ecuador": "\U0001f1ea\U0001f1e8",
    "Colombia": "\U0001f1e8\U0001f1f4",
    "Chile": "\U0001f1e8\U0001f1f1",
    "Peru": "\U0001f1f5\U0001f1ea",
    "Venezuela": "\U0001f1fb\U0001f1ea",
    "Paraguay": "\U0001f1f5\U0001f1fe",
    "Bolivia": "\U0001f1e7\U0001f1f4",
    "Saudi Arabia": "\U0001f1f8\U0001f1e6",
    "Iran": "\U0001f1ee\U0001f1f7",
    "Qatar": "\U0001f1f6\U0001f1e6",
    "South Africa": "\U0001f1ff\U0001f1e6",
    "Egypt": "\U0001f1ea\U0001f1ec",
    "Algeria": "\U0001f1e9\U0001f1ff",
    "Poland": "\U0001f1f5\U0001f1f1",
    "Serbia": "\U0001f1f7\U0001f1f8",
    "Ukraine": "\U0001f1fa\U0001f1e6",
    "Turkey": "\U0001f1f9\U0001f1f7",
    "Austria": "\U0001f1e6\U0001f1f9",
    "Czech Republic": "\U0001f1e8\U0001f1ff",
    "Hungary": "\U0001f1ed\U0001f1fa",
    "Romania": "\U0001f1f7\U0001f1f4",
    "Slovakia": "\U0001f1f8\U0001f1f0",
    "Slovenia": "\U0001f1f8\U0001f1ee",
    "Scotland": "\U0001f3f4\U000e0067\U000e0062\U000e0073\U000e0063\U000e0074\U000e007f",
    "Wales": "\U0001f3f4\U000e0067\U000e0062\U000e0077\U000e006c\U000e0073\U000e007f",
    "Ireland": "\U0001f1ee\U0001f1ea",
    "Norway": "\U0001f1f3\U0001f1f4",
    "Sweden": "\U0001f1f8\U0001f1ea",
    "Finland": "\U0001f1eb\U0001f1ee",
    "Greece": "\U0001f1ec\U0001f1f7",
    "Italy": "\U0001f1ee\U0001f1f9",
    "Costa Rica": "\U0001f1e8\U0001f1f7",
    "Panama": "\U0001f1f5\U0001f1e6",
    "Honduras": "\U0001f1ed\U0001f1f3",
    "Jamaica": "\U0001f1ef\U0001f1f2",
    "New Zealand": "\U0001f1f3\U0001f1ff",
    "Indonesia": "\U0001f1ee\U0001f1e9",
    "Iraq": "\U0001f1ee\U0001f1f6",
    "Jordan": "\U0001f1ef\U0001f1f4",
}


# ---------------------------------------------------------------------------
# Stage / group helpers
# ---------------------------------------------------------------------------

def map_round_to_stage(round_str: str, has_group: bool = False) -> str:
    if has_group:
        return "group"
    r = round_str.lower()
    if "round of 32" in r:
        return "round_of_32"
    if "round of 16" in r:
        return "round_of_16"
    if "quarter" in r:
        return "quarterfinal"
    if "semi" in r:
        return "semifinal"
    if "final" in r:
        return "final"
    return "group"


def extract_group(group_str: str | None) -> str | None:
    if not group_str:
        return None
    m = re.match(r"Group\s+([A-L])", group_str, re.IGNORECASE)
    return m.group(1).upper() if m else None


def make_doc_id(date_str: str, team1: str, team2: str) -> str:
    """Generate a stable Firestore doc ID from date + team names."""
    def slugify(s: str) -> str:
        return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_")
    return f"{date_str}_{slugify(team1)}_{slugify(team2)}"


def parse_match_datetime(date_str: str, time_str: str | None) -> datetime | None:
    """
    Parse OpenFootball date ('2026-06-11') and time ('13:00 UTC-6') into
    a UTC-aware datetime.
    """
    if not date_str:
        return None
    try:
        year, month, day = int(date_str[:4]), int(date_str[5:7]), int(date_str[8:10])
    except (ValueError, IndexError):
        return None

    if not time_str:
        return datetime(year, month, day, 12, 0, tzinfo=timezone.utc)

    # Match "13:00 UTC-6" or "20:00 UTC+2"
    m = re.match(r"(\d{1,2}):(\d{2})\s*UTC([+-]\d+)", time_str)
    if not m:
        return datetime(year, month, day, 12, 0, tzinfo=timezone.utc)

    hour, minute, offset_hours = int(m.group(1)), int(m.group(2)), int(m.group(3))
    tz = timezone(timedelta(hours=offset_hours))
    local_dt = datetime(year, month, day, hour, minute, tzinfo=tz)
    return local_dt.astimezone(timezone.utc)


# ---------------------------------------------------------------------------
# Data fetching
# ---------------------------------------------------------------------------

def fetch_matches() -> list[dict]:
    """Fetch all WC2026 fixtures from OpenFootball."""
    try:
        response = requests.get(DATA_URL, timeout=30)
        response.raise_for_status()
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not fetch data from OpenFootball. Check your internet connection.")
        sys.exit(1)
    except requests.exceptions.Timeout:
        print("ERROR: Request timed out.")
        sys.exit(1)
    except requests.exceptions.HTTPError as exc:
        print(f"ERROR: HTTP {response.status_code} fetching fixture data: {exc}")
        sys.exit(1)

    return response.json().get("matches", [])


def build_match_doc(match: dict) -> tuple[str, dict]:
    """Return (doc_id, firestore_dict) for a single OpenFootball match entry."""
    team1 = match.get("team1", "")
    team2 = match.get("team2", "")
    date_str = match.get("date", "")
    time_str = match.get("time")
    round_str = match.get("round", "")
    group_str = match.get("group")  # e.g. "Group A", absent for knockout rounds

    doc_id = make_doc_id(date_str, team1, team2)
    match_dt = parse_match_datetime(date_str, time_str)

    # OpenFootball uses score1/score2 for the 90-minute result.
    # Fields are absent (not None) until the match is played.
    score1 = match.get("score1")
    score2 = match.get("score2")
    is_finished = score1 is not None and score2 is not None

    doc: dict = {
        "externalId": doc_id,
        "homeTeam": team1,
        "awayTeam": team2,
        "homeTeamFlag": FLAG_MAP.get(team1, "🏳️"),
        "awayTeamFlag": FLAG_MAP.get(team2, "🏳️"),
        "matchDate": match_dt,
        "stage": map_round_to_stage(round_str, has_group=bool(group_str)),
        "group": extract_group(group_str),
    }
    # Only include result fields when OpenFootball knows the score — this prevents
    # sync-matches from clobbering 'finished' status set by sync-results.
    if is_finished:
        doc["homeScore"] = score1
        doc["awayScore"] = score2
        doc["status"] = "finished"
    return doc_id, doc
