"""
Predictor — loads the trained model and runs inference with confidence scores.
"""
import os
import json
import joblib
import numpy as np

from ml.feature_builder import build_features, FEATURE_COLUMNS


LABEL_ORDER = ['Low', 'Medium', 'High']


class TrafficPredictor:
    """
    Singleton-style inference wrapper.
    Loads the model lazily on first use and caches it in memory.
    """

    def __init__(self, model_path: str = 'model.pkl', metadata_path: str = 'model_metadata.json'):
        self.model_path    = model_path
        self.metadata_path = metadata_path
        self._model        = None
        self._label_encoder = None
        self._metadata     = None

    def _load(self):
        if self._model is not None:
            return

        if not os.path.exists(self.model_path):
            raise FileNotFoundError(
                f"Model file not found at '{self.model_path}'. "
                "Run train_model.py first."
            )

        payload = joblib.load(self.model_path)
        self._model         = payload['model']
        self._label_encoder = payload['label_encoder']

        if os.path.exists(self.metadata_path):
            with open(self.metadata_path) as f:
                self._metadata = json.load(f)

        print(f"[ML] Model loaded from '{self.model_path}'")
        if self._metadata:
            acc = self._metadata.get('test_accuracy', 'N/A')
            alg = self._metadata.get('algorithm', 'Unknown')
            print(f"[ML] Algorithm: {alg} | Test Accuracy: {acc}")

    def predict(
        self,
        time_of_day: int,
        day_of_week: int,
        weather: int,
        road_type: int,
    ) -> dict:
        """
        Run inference and return a rich result dict.

        Returns
        -------
        {
            'level':         'Low' | 'Medium' | 'High',
            'confidence':    float (max probability),
            'probabilities': {'Low': float, 'Medium': float, 'High': float},
        }
        """
        self._load()

        X = build_features(time_of_day, day_of_week, weather, road_type)

        # Get class probabilities
        proba = self._model.predict_proba(X)[0]

        # Map probabilities to label names via label encoder
        classes = self._label_encoder.classes_.tolist()  # e.g. ['High', 'Low', 'Medium']
        prob_dict = dict(zip(classes, proba.tolist()))

        # Ensure all three keys exist
        prob_dict = {
            'Low':    prob_dict.get('Low', 0.0),
            'Medium': prob_dict.get('Medium', 0.0),
            'High':   prob_dict.get('High', 0.0),
        }

        # Predicted label = argmax
        predicted_label = max(prob_dict, key=prob_dict.get)
        confidence      = prob_dict[predicted_label]

        return {
            'level':         predicted_label,
            'confidence':    round(confidence, 4),
            'probabilities': {k: round(v, 4) for k, v in prob_dict.items()},
        }

    def fallback_predict(self, time_of_day: int, weather: int) -> dict:
        """
        Rule-based fallback when model is not available.
        """
        weather_severity = {0: 0, 1: 1, 2: 3, 3: 5, 4: 4, 5: 5}.get(weather, 0)
        is_rush = 7 <= time_of_day <= 9 or 16 <= time_of_day <= 19
        is_night = time_of_day >= 22 or time_of_day <= 5

        if is_rush or weather_severity >= 4:
            level = 'High'
            probs = {'Low': 0.05, 'Medium': 0.20, 'High': 0.75}
        elif is_night:
            level = 'Low'
            probs = {'Low': 0.75, 'Medium': 0.20, 'High': 0.05}
        else:
            level = 'Medium'
            probs = {'Low': 0.20, 'Medium': 0.60, 'High': 0.20}

        return {
            'level':         level,
            'confidence':    probs[level],
            'probabilities': probs,
        }

    @property
    def metadata(self) -> dict:
        self._load()
        return self._metadata or {}

    def reload(self):
        """Force reload the model from disk (useful after retraining)."""
        self._model         = None
        self._label_encoder = None
        self._metadata      = None
        self._load()


# Module-level singleton
predictor = TrafficPredictor()
