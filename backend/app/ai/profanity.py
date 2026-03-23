import re
import pandas as pd
import joblib
import numpy as np
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import load_model
from pathlib import Path

# ==========================
# PATHS
# ==========================
BASE_DIR = Path(__file__).resolve().parent
BADWORDS_FILE = BASE_DIR / "data" / "badwords.csv"
MODEL_FILE = BASE_DIR / "profanity_model.keras"  
TOKENIZER_FILE = BASE_DIR / "profanity_tokenizer.pkl"
MAXLEN_FILE = BASE_DIR / "profanity_maxlen.pkl"

# ==========================
# LOAD BAD WORDS
# ==========================
badwords_df = pd.read_csv(BADWORDS_FILE)
badwords_set = set(
    badwords_df.iloc[:, 0].dropna().str.lower().tolist()
)

# ==========================
# LOAD MODEL COMPONENTS
# ==========================
model = load_model(MODEL_FILE)
tokenizer = joblib.load(TOKENIZER_FILE)
max_len = joblib.load(MAXLEN_FILE)

# ==========================
# TEXT CLEANING FUNCTION
# ==========================
def clean_text(text: str) -> str:
    """
    Lowercase and remove special characters.
    Prevents bypass like: 'idiot!!!' or 'i.d.i.o.t'
    """
    text = text.lower()
    text = re.sub(r"[^a-zA-Z0-9\s]", "", text)
    return text

# ==========================
# MAIN CHECK FUNCTION
# ==========================
def check_profanity(text: str) -> bool:
    """
    Returns True if text contains profanity.
    Hybrid system:
    1. Direct word match (fast)
    2. LSTM prediction (smart detection)
    """

    if not text:
        return False

    text = clean_text(text)

    # 1️⃣ Direct dictionary check
    words = text.split()
    if any(word in badwords_set for word in words):
        return True

    # 2️⃣ LSTM model prediction
    seq = tokenizer.texts_to_sequences([text])
    seq_padded = pad_sequences(seq, maxlen=max_len, padding='post')

    prediction = model.predict(seq_padded, verbose=0)[0][0]

    # You can tune threshold (0.5 default)
    return prediction >= 0.6