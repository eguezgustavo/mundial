# Mundial Sync — FIFA World Cup 2026 Data Processor

This is the **authoritative data processor** for the Mundial prediction app.
It fetches match data from the [ESPN scoreboard API](https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard)
(no API key required) and writes it to Firestore. The frontend app never
calls the API directly — only this script does.

---

## Setup

### 1. Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) installed
- Python 3.11+ (uv will manage this automatically)
- A Firebase project with Firestore enabled

### 2. Install dependencies

```bash
cd sync/
uv sync
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccount.json
```

### 4. Download the Firebase service account key

1. Open the [Firebase console](https://console.firebase.google.com/)
2. Go to **Project settings** → **Service accounts**
3. Click **Generate new private key** → **Generate key**
4. Save the downloaded JSON file as `sync/serviceAccount.json`

> `serviceAccount.json` is listed in `.gitignore` and must **never** be
> committed to version control.

---

## Commands

Run all commands with `uv run`:

### `uv run python main.py sync-fixtures`

Fetches knockout-stage fixtures (Round of 32 through Final) from ESPN and
updates team names, logos, and stage in Firestore, creating docs for
matches that don't exist yet (e.g. the third-place match). Run whenever new
teams are confirmed — best-thirds finalized, bracket advances, etc.

### `uv run python main.py sync-results`

Fetches finished matches from ESPN (yesterday + today) and updates score,
status, and team info in Firestore. Also resolves previously-TBD knockout
team names. Run daily after match days.

### `uv run python main.py sync-logos`

Fetches team logo URLs from ESPN for every match date already in Firestore
and backfills `homeTeamFlag` / `awayTeamFlag` on any match document missing
one.

### `uv run python main.py sync-top-scorers`

Fetches the tournament-wide goals leaderboard from ESPN and writes it to
`/stats/topScorers` for the app's Goleadores tab. Run daily.

### `uv run python main.py process-scores`

For every finished match in Firestore:
1. Fetches all predictions for that match from `/predictions`
2. Calculates points per prediction:
   - **20 pts** — exact score prediction
   - **5 pts** — correct winner / draw prediction
   - **0 pts** — wrong prediction
3. Writes the `points` field to each prediction document
4. Recomputes `totalScore` for every user and writes it to `/users/{userId}`

This command is **idempotent** — safe to run multiple times.

---

## Recommended workflow

### Daily (automated via `.github/workflows/daily-sync.yml`)

```bash
uv run python main.py sync-fixtures     # pick up newly-confirmed teams
uv run python main.py sync-results      # update scores for finished matches
uv run python main.py process-scores    # recalculate prediction points & leaderboard
uv run python main.py sync-top-scorers  # refresh the goals leaderboard
```

---

## Firestore data model (reference)

```
/matches/{externalId}
  externalId: string
  homeTeam: string
  awayTeam: string
  homeTeamFlag: string
  awayTeamFlag: string
  matchDate: Timestamp
  stage: "group" | "round_of_32" | "round_of_16" | "quarterfinal" | "semifinal" | "third_place" | "final"
  group: string | null        # e.g. "A", "B" — only for group stage
  homeScore: number | null    # null until match is finished
  awayScore: number | null
  status: "upcoming" | "finished"

/predictions/{predictionId}
  matchId: string             # matches doc ID
  userId: string              # users doc ID
  predictedHomeScore: number
  predictedAwayScore: number
  predictedWinner: "home" | "away" | "tie"
  points: number              # written by process-scores

/users/{userId}
  totalScore: number          # written by process-scores

/stats/topScorers
  players: array              # ranked list, written by sync-top-scorers
    rank: number
    name: string               # player display name
    team: string                # country name
    teamFlag: string            # team logo URL
    goals: number
    appearances: number | null
  updatedAt: Timestamp
```
