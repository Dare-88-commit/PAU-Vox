import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib

def train_and_save():
    # Load dataset
    df = pd.read_csv("app/ai/data/university_queries_test.csv")
    
    text_col = 'Student_Query'
    label_col = 'Priority_Label'

    # Drop missing values
    df = df.dropna(subset=[text_col, label_col])

    # Remove duplicate queries to prevent overfitting
    df = df.drop_duplicates(subset=[text_col])

    # Check class distribution
    print("Class distribution:\n", df[label_col].value_counts())

    # Vectorize text
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(df[text_col])
    y = df[label_col]

    # Stratified train-test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Random Forest with balanced class weights
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        max_features='sqrt',
        class_weight='balanced',  # <-- critical for imbalanced dataset
        random_state=42
    )
    model.fit(X_train, y_train)

    # Evaluate on test set
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\nTest Set Accuracy: {acc*100:.2f}%")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))

    # 5-fold cross-validation for robustness
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(model, X, y, cv=cv, scoring='accuracy')
    print(f"\n5-Fold Cross-Validation Accuracy: {cv_scores.mean()*100:.2f}% (+/- {cv_scores.std()*100:.2f}%)")

    # Save model and vectorizer
    joblib.dump(model, "app/ai/urgency_model.pkl")
    joblib.dump(vectorizer, "app/ai/vectorizer.pkl")
    print("\nModel and vectorizer saved successfully!")

if __name__ == "__main__":
    train_and_save()