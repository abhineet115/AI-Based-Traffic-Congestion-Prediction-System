"""
ML Trainer — generates synthetic data, engineers features, trains
a Gradient Boosting classifier, and saves the model + metadata.
"""
import os
import json
import random
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone

from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix
)
from sklearn.preprocessing import LabelEncoder

from ml.feature_builder import build_features_batch, FEATURE_COLUMNS


# ── Label order for consistent encoding ──────────────────────────────────────
LABEL_ORDER = ['Low', 'Medium', 'High']


def generate_traffic_data(num_samples: int = 20_000, seed: int = 42) -> pd.DataFrame:
    """
    Generate a realistic synthetic traffic dataset.

    Feature distributions are calibrated to match real-world patterns:
    - Rush hours dominate congestion
    - Weekends have 30% less traffic
    - Bad weather amplifies congestion
    - Highway types handle more volume but attract more vehicles
    """
    random.seed(seed)
    np.random.seed(seed)

    # Construct base records
    hours    = np.random.randint(0, 24, num_samples)
    days     = np.random.randint(0, 7,  num_samples)
    weathers = np.random.choice([0, 1, 2, 3, 4, 5], num_samples,
                                 p=[0.45, 0.20, 0.15, 0.08, 0.07, 0.05])
    roads    = np.random.choice([0, 1, 2], num_samples, p=[0.40, 0.35, 0.25])

    df = pd.DataFrame({
        'time_of_day': hours,
        'day_of_week': days,
        'weather':     weathers,
        'road_type':   roads,
    })

    # ── Congestion score heuristic ───────────────────────────────────────────
    score = np.zeros(num_samples)

    # Rush hours
    rush = ((hours >= 7) & (hours <= 9)) | ((hours >= 16) & (hours <= 19))
    score += rush * np.random.uniform(4.0, 7.0, num_samples)

    # Midday moderate traffic
    midday = (hours >= 10) & (hours <= 15)
    score += midday * np.random.uniform(1.5, 3.5, num_samples)

    # Late night bonus (clear roads)
    late = (hours >= 22) | (hours <= 5)
    score -= late * np.random.uniform(2.0, 4.0, num_samples)

    # Weekend dampening
    weekend = days >= 5
    score -= weekend * np.random.uniform(1.0, 2.5, num_samples)

    # Weather impact
    weather_impact = np.array([0, 0.5, 2.0, 4.0, 3.5, 4.5])
    score += weather_impact[weathers] * np.random.uniform(0.7, 1.3, num_samples)

    # Highway attracts more vehicles but handles volume well → moderate bump
    score += (roads == 1) * np.random.uniform(0.5, 2.0, num_samples)
    # Arterial roads bottleneck quickly
    score += (roads == 2) * np.random.uniform(0.8, 2.5, num_samples)

    # Random noise
    score += np.random.normal(0, 0.8, num_samples)

    # ── Map score → label ───────────────────────────────────────────────────
    labels = np.select(
        [score >= 6.5, score >= 3.0],
        ['High', 'Medium'],
        default='Low'
    )
    df['congestion'] = labels

    return df


def train_and_save(
    model_path: str = 'model.pkl',
    metadata_path: str = 'model_metadata.json',
    num_samples: int = 20_000,
) -> dict:
    """
    Full training pipeline:
    1. Generate data
    2. Engineer features
    3. Train Gradient Boosting classifier
    4. Evaluate and save model + metadata

    Returns the metadata dict with accuracy and feature importances.
    """
    print(f"\n{'='*60}")
    print("  Traffic Congestion ML Training Pipeline")
    print(f"{'='*60}\n")

    # ── Step 1: Data generation ─────────────────────────────────────────────
    print(f"[1/5] Generating {num_samples:,} synthetic training samples...")
    df = generate_traffic_data(num_samples)

    dist = df['congestion'].value_counts()
    print(f"      Label distribution: {dist.to_dict()}")

    # ── Step 2: Feature engineering ─────────────────────────────────────────
    print("[2/5] Engineering features...")
    X = build_features_batch(df)
    y = df['congestion']

    le = LabelEncoder()
    le.classes_ = np.array(LABEL_ORDER)
    y_encoded = le.transform(y)

    print(f"      Features ({len(FEATURE_COLUMNS)}): {FEATURE_COLUMNS}")

    # ── Step 3: Train/test split ─────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_encoded, test_size=0.20, random_state=42, stratify=y_encoded
    )
    print(f"      Train: {len(X_train):,} | Test: {len(X_test):,}")

    # ── Step 4: Train Gradient Boosting ──────────────────────────────────────
    print("[3/5] Training Gradient Boosting Classifier...")
    model = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.08,
        max_depth=5,
        min_samples_split=20,
        min_samples_leaf=10,
        subsample=0.85,
        max_features='sqrt',
        random_state=42,
        verbose=0,
    )
    model.fit(X_train, y_train)

    # ── Step 5: Evaluation ───────────────────────────────────────────────────
    print("[4/5] Evaluating model...")
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    cv_scores = cross_val_score(model, X, y_encoded, cv=5, scoring='accuracy')
    cv_mean  = float(cv_scores.mean())
    cv_std   = float(cv_scores.std())

    print(f"\n      [OK] Test Accuracy:       {accuracy * 100:.2f}%")
    print(f"      [OK] 5-Fold CV Accuracy:  {cv_mean * 100:.2f}% +/- {cv_std * 100:.2f}%")

    print("\n      Classification Report:")
    report = classification_report(y_test, y_pred, target_names=LABEL_ORDER)
    print(report)

    # Feature importances
    importances = dict(zip(FEATURE_COLUMNS, model.feature_importances_.tolist()))
    top_features = sorted(importances.items(), key=lambda x: x[1], reverse=True)[:5]
    print("      Top 5 features by importance:")
    for feat, imp in top_features:
        print(f"        {feat:<35} {imp:.4f}")

    # ── Step 6: Save model ───────────────────────────────────────────────────
    print(f"\n[5/5] Saving model -> {model_path}")
    joblib.dump({'model': model, 'label_encoder': le}, model_path)

    metadata = {
        'trained_at':          datetime.now(timezone.utc).isoformat(),
        'num_samples':         num_samples,
        'algorithm':           'GradientBoostingClassifier',
        'n_estimators':        200,
        'learning_rate':       0.08,
        'max_depth':           5,
        'test_accuracy':       round(accuracy, 4),
        'cv_accuracy_mean':    round(cv_mean, 4),
        'cv_accuracy_std':     round(cv_std, 4),
        'feature_columns':     FEATURE_COLUMNS,
        'label_classes':       LABEL_ORDER,
        'feature_importances': {k: round(v, 6) for k, v in importances.items()},
    }

    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    print(f"      Metadata saved -> {metadata_path}")
    print(f"\n{'='*60}")
    print(f"  Training complete! Accuracy: {accuracy * 100:.2f}%")
    print(f"{'='*60}\n")

    return metadata
