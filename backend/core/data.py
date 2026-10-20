"""
Loads the joblib artifacts once at app startup and holds them in memory.
Other modules import `movies_df`, `vectors`, `keyword_vectors` from here.

Also precomputes lookups so requests don't redo them:
- `vectors` is L2-normalized in place (raw rows = vectors * vector_norms[:, None]),
  so cosine similarity is a single matrix-vector product
- `ids` / `titles` are numpy arrays aligned with movies_df row positions
- `title_to_indices` maps a title to every row position with that title
"""

import joblib
import numpy as np
from pathlib import Path
from sklearn.preprocessing import normalize

MODELS_DIR = Path(__file__).parent.parent / "models"

movies_df = None
vectors = None
vector_norms = None
keyword_vectors = None
ids = None
titles = None
title_to_indices = None


def load_artifacts():
    global movies_df, vectors, vector_norms, keyword_vectors
    global ids, titles, title_to_indices
    movies_df = joblib.load(MODELS_DIR / "movies_df.joblib")
    vectors = joblib.load(MODELS_DIR / "vectors.joblib")
    keyword_vectors = joblib.load(MODELS_DIR / "keyword_vectors.joblib")

    # Normalize in place rather than keeping a second ~140MB copy
    vectors, vector_norms = normalize(vectors, copy=False, return_norm=True)

    ids = movies_df["id"].to_numpy()
    titles = movies_df["title"].to_numpy()
    title_to_indices = {}
    for i, title in enumerate(titles):
        title_to_indices.setdefault(title, []).append(i)

    print(f"Loaded {len(movies_df)} movies, vectors shape {vectors.shape}")
