import joblib
import os

class UrgencyModel:
    def __init__(self):
        # Use absolute paths to be safe
        # This gets the directory where THIS file (urgency_model.py) is located
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        model_path = os.path.join(current_dir, "urgency_model.pkl")
        vec_path = os.path.join(current_dir, "vectorizer.pkl")
        
        if not os.path.exists(model_path) or not os.path.exists(vec_path):
            raise FileNotFoundError(f"Missing AI files in {current_dir}. Run train_urgency.py first!")

        # Load the saved 'brain' files
        self.model = joblib.load(model_path)
        self.vectorizer = joblib.load(vec_path)

    def predict(self, text: str):
        # This will only run if __init__ succeeded
        X = self.vectorizer.transform([text])
        prediction = self.model.predict(X)
        return prediction[0]