"""
Script to create demo data for unified analysis testing
"""
from backend.app.database import SessionLocal
from backend.app.models.db_models import SpeechTestResult, CognitiveGameSession
from datetime import datetime

def create_demo_data():
    db = SessionLocal()
    user_id = "demo_user_001"

    try:
        # Create speech test result
        speech_test = SpeechTestResult(
            user_id=user_id,
            session_id=f"demo_session_{user_id}",
            completed=True,
            overall_risk_score=93.0,
            risk_level="High",
            pause_score=85.0,
            reaction_time_score=90.0,
            speech_quality_score=88.0,
            accuracy_score=75.0,
            avg_pause_duration=1.8,
            avg_reaction_time_ms=2400.0,
            avg_speech_rate_wpm=85.0,
            avg_word_accuracy=0.75,
            created_at=datetime.now()
        )
        db.add(speech_test)

        # Create cognitive game sessions (all 4 games)
        games = [
            {
                'game_type': 'memory_match',
                'score': 45.0,
                'memory_score': 45.0,
                'attention_score': 50.0,
                'processing_speed_score': 48.0
            },
            {
                'game_type': 'stroop_test',
                'score': 60.0,
                'attention_score': 60.0,
                'processing_speed_score': 58.0,
                'executive_function_score': 55.0
            },
            {
                'game_type': 'trail_making',
                'score': 50.0,
                'attention_score': 52.0,
                'executive_function_score': 50.0,
                'processing_speed_score': 45.0
            },
            {
                'game_type': 'pattern_recognition',
                'score': 55.0,
                'executive_function_score': 55.0,
                'processing_speed_score': 52.0,
                'memory_score': 50.0
            }
        ]

        for i, game in enumerate(games):
            session = CognitiveGameSession(
                session_id=f"demo_game_{user_id}_{game['game_type']}",
                user_id=user_id,
                game_type=game['game_type'],
                score=game['score'],
                completed=True,
                memory_score=game.get('memory_score'),
                attention_score=game.get('attention_score'),
                processing_speed_score=game.get('processing_speed_score'),
                executive_function_score=game.get('executive_function_score'),
                created_at=datetime.now()
            )
            db.add(session)

        db.commit()
        print("✅ Demo data created successfully!")
        print(f"   User ID: {user_id}")
        print(f"   Speech test: 93/100 risk score")
        print(f"   Cognitive games: 4 games completed")
        print(f"   Average game score: {sum(g['score'] for g in games) / len(games):.1f}/100")

    except Exception as e:
        print(f"❌ Error creating demo data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_demo_data()
