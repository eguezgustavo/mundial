# Mundial Sync — FIFA World Cup 2026 Data Processor

This is the **authoritative data processor** for the Mundial prediction app.
It fetches match data from [API-Football](https://www.api-football.com/) and
writes it to Firestore. The frontend app never calls the API directly — only
this script does.

---

## Setup

### 1. Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) installed
- Python 3.11+ (uv will manage this automatically)
- A Firebase project with Firestore enabled
- An API-Football account (free tier works)

### 2. Install dependencies

```bash
cd sync/
uv sync
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in both values:

```
API_FOOTBALL_KEY=your_api_football_key_here
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

### `uv run python main.py sync-matches`

Fetches **all** World Cup 2026 fixtures from API-Football and upserts them into
Firestore at `/matches/{externalId}`.

Fields written per match document:

| Field | Source |
|---|---|
| `externalId` | `fixture.id` |
| `homeTeam` / `awayTeam` | `teams.home.name` / `teams.away.name` |
| `homeTeamFlag` / `awayTeamFlag` | flag emoji map |
| `matchDate` | `fixture.date` (Firestore Timestamp) |
| `stage` | mapped from `league.round` |
| `group` | extracted letter from round string (group stage only) |
| `homeScore` / `awayScore` | `goals.home` / `goals.away` (only when FT) |
| `status` | `"finished"` if FT, else `"upcoming"` |

### `uv run python main.py sync-results`

Fetches only **finished** (status `FT`) fixtures and updates the score and
status fields in Firestore. Faster than a full sync — run this after each
match day.

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

### Before the tournament starts

```bash
uv run python main.py sync-matches   # one-time full fixture import
```

### Daily (after match days)

```bash
uv run python main.py sync-results   # update scores for finished matches
uv run python main.py process-scores # recalculate prediction points & leaderboard
```

You can automate these with a cron job or GitHub Actions scheduled workflow.

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
  stage: "group" | "round_of_32" | "round_of_16" | "quarterfinal" | "semifinal" | "final"
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
```
