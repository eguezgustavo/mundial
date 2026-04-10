# Mundial 2026 — World Cup Prediction App

A real-time FIFA World Cup 2026 prediction app built with React, TypeScript, Firebase, and Tailwind CSS.

## Setup

### 1. Clone and install
```bash
git clone <repo>
cd mundial
npm install
```

### 2. Create a Firebase project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Firestore** (Native mode)
4. Get your web app config from Project Settings

### 3. Configure environment
```bash
cp .env.example .env
```
Fill in your Firebase config values in `.env`.

### 4. Create the first admin user
In Firestore console, create a document at `/users/<your-token>`:
```json
{
  "token": "your-secret-admin-token",
  "displayName": "Admin",
  "isAdmin": true,
  "totalScore": 0
}
```
Your invite link will be: `https://yourapp.com/?token=your-secret-admin-token`

### 5. Add regular users
Create documents in `/users/<token>` for each player:
```json
{
  "token": "unique-random-token",
  "displayName": "Player Name",
  "isAdmin": false,
  "totalScore": 0
}
```
Invite link: `https://yourapp.com/?token=unique-random-token`
Use a UUID generator for tokens.

### 6. Configure API-Football
In Firestore, create `/config/apiFootball`:
```json
{
  "apiKey": "your-api-football-key"
}
```
Get a free key at [api-sports.io](https://api-sports.io).

### 7. Run locally
```bash
npm run dev
```

### 8. Deploy
```bash
npm run build
firebase deploy
```

## Scoring Rules
- Correct winner or draw prediction: **5 points**
- Correct exact score: **20 points** (not cumulative with 5)
- No prediction submitted: **0 points**

## Deadline
Predictions lock at **23:59 UTC-5** the day before each match.
