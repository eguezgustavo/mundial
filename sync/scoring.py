"""
Point calculation logic for predictions.
"""


def get_actual_winner(home_score: int, away_score: int) -> str:
    if home_score > away_score:
        return "home"
    elif away_score > home_score:
        return "away"
    return "tie"


def calculate_points(match_data: dict, prediction_data: dict) -> int:
    home_score = match_data.get("homeScore")
    away_score = match_data.get("awayScore")
    if home_score is None or away_score is None:
        return 0
    pred_home = prediction_data.get("predictedHomeScore", -1)
    pred_away = prediction_data.get("predictedAwayScore", -1)
    if pred_home == home_score and pred_away == away_score:
        return 20
    actual_winner = get_actual_winner(home_score, away_score)
    if prediction_data.get("predictedWinner") == actual_winner:
        return 5
    return 0
