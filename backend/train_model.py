"""
train_model.py — entry point for training the ML model.
Run this script from the backend/ directory:
    python train_model.py
"""
import sys
import os

# Allow imports from backend root
sys.path.insert(0, os.path.dirname(__file__))

from ml.trainer import train_and_save

if __name__ == '__main__':
    train_and_save(
        model_path='model.pkl',
        metadata_path='model_metadata.json',
        num_samples=20_000,
    )
