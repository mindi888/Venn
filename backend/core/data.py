"""
Loads the joblib artifacts once at app startup and holds them in memory.
Other modules import `movies_df`, `vectors`, `keyword_vectors` from here.
"""

import joblib
from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent / "models"

movies_df = None
vectors = None
keyword_vectors = None


def load_artifacts():
    global movies_df, vectors, keyword_vectors
    movies_df = joblib.load(MODELS_DIR / "movies_df.joblib")
    vectors = joblib.load(MODELS_DIR / "vectors.joblib")
    keyword_vectors = joblib.load(MODELS_DIR / "keyword_vectors.joblib")
    print(f"Loaded {len(movies_df)} movies, vectors shape {vectors.shape}")
