import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Embedding, LSTM, Dense, Dropout
from sklearn.metrics import accuracy_score
import joblib
import random

# Paths
BADWORDS_FILE = "app/ai/data/badwords.csv"
MODEL_FILE = "app/ai/profanity_model.keras"  # Updated format
TOKENIZER_FILE = "app/ai/profanity_tokenizer.pkl"
MAXLEN_FILE = "app/ai/profanity_maxlen.pkl"

# ===============================
# 1️⃣ Load bad words
# ===============================
badwords_df = pd.read_csv(BADWORDS_FILE)
badwords_list = badwords_df.iloc[:, 0].dropna().str.lower().tolist()

print(f"Loaded {len(badwords_list)} bad words.")

# ===============================
# 2️⃣ Generate Training Dataset
# ===============================

# Clean student-like feedback (non-profane)
clean_sentences = [
    "I love this portal",
    "The system is slow",
    "Thank you for your help",
    "I need assistance with registration",
    "This course is difficult",
    "The timetable is confusing",
    "Please fix the login issue",
    "I appreciate the support",
    "The results are not showing",
    "The interface looks good"
]

# Generate profane sentences using badwords list
profane_sentences = []
for word in random.sample(badwords_list, min(500, len(badwords_list))):
    profane_sentences.append(f"You are {word}")
    profane_sentences.append(f"This system is {word}")
    profane_sentences.append(f"What the {word}")

# Combine dataset
X_text = clean_sentences + profane_sentences
y = np.array([0]*len(clean_sentences) + [1]*len(profane_sentences))

print(f"Training samples: {len(X_text)}")

# ===============================
# 3️⃣ Tokenize
# ===============================
tokenizer = Tokenizer(oov_token="<OOV>")
tokenizer.fit_on_texts(X_text)

sequences = tokenizer.texts_to_sequences(X_text)
max_len = max(len(seq) for seq in sequences)

X = pad_sequences(sequences, maxlen=max_len, padding='post')

# ===============================
# 4️⃣ Build Model
# ===============================
vocab_size = len(tokenizer.word_index) + 1
embedding_dim = 64

model = Sequential([
    Embedding(input_dim=vocab_size, output_dim=embedding_dim),
    LSTM(64),
    Dropout(0.3),
    Dense(1, activation='sigmoid')
])

model.compile(
    loss='binary_crossentropy',
    optimizer='adam',
    metrics=['accuracy']
)

model.summary()

# ===============================
# 5️⃣ Train
# ===============================
history = model.fit(
    X, y,
    epochs=10,
    batch_size=32,
    validation_split=0.2,
    verbose=1
)

# ===============================
# 6️⃣ Evaluate
# ===============================
y_pred_prob = model.predict(X)
y_pred = (y_pred_prob >= 0.5).astype(int).flatten()
acc = accuracy_score(y, y_pred)

print(f"\nFinal Training Accuracy: {acc*100:.2f}%")

# ===============================
# 7️⃣ Save Everything
# ===============================
model.save(MODEL_FILE)
joblib.dump(tokenizer, TOKENIZER_FILE)
joblib.dump(max_len, MAXLEN_FILE)

print("✅ Profanity model, tokenizer, and max_len saved successfully!")