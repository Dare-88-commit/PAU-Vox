from app.ai.urgency import UrgencyModel

def test_ai_logic():
    # You must create the object first
    ai_engine = UrgencyModel()
    
    test_inputs = [
        "I need help in the bathroom, it's an emergency!",
        "Where is the library located?",
        "My password isn't working, but I can check later."
    ]

    print("\n--- Testing Urgency Class ---")
    for text in test_inputs:
        result = ai_engine.predict(text)
        print(f"Input: {text} -> Prediction: {result}")

if __name__ == "__main__":
    test_ai_logic()