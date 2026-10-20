"""
Recommendation logic — adapted from the notebook.
Uses movies_df, vectors, keyword_vectors loaded in core.data at app startup.
"""
import re
import random
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

from core import data

OVERLAP_PRESETS = {
    "tight": (0, 70),     # only the most tightly-aligned matches
    "normal": (50, 250),   # current default behavior
    "loose": (100, 400),   # skip the closest matches, pull from a wider, looser pool
}


def get_franchise_key(title, n_words=2):
    clean = re.sub(r'[^\w\s]', '', title.lower())  # strip punctuation
    words = clean.split()
    if words and words[0] in ("a", "an"):    # drop leading article so it doesn't skew the key
        words = words[1:]
    return " ".join(words[:n_words])

def get_director_keys(row):
    # Extracts a set of normalized director names from a row.
    directors = row.get("director_list", [])
    if isinstance(directors, list):
        return {str(d).strip().lower() for d in directors if d}
    elif isinstance(directors, str):
        return {directors.strip().lower()}
    return set()


def build_movie_dict(row, wildcard: bool = False) -> dict:
    d = {
        "id": int(row.id),
        "title": row.title,
        "poster_path": row.poster_path,
        "runtime": float(row.runtime) if pd.notna(row.runtime) else None,
        "vote_average": float(row.vote_average),
        "release_date": str(row.release_date),
        "genres": row.genres_list,
        "overview": row.overview,
        "tagline": row.tagline if pd.notna(row.tagline) else None,
        "cast": row.cast_list,
        "director": row.director_list,
    }
    if wildcard:
        d["wildcard"] = True
    return d


def recommend(
    movie_title: str,
    max_per_franchise: int = 2,
    n_results: int = 10,
    include_wildcard: bool = True,
    exclude_ids: list = None,):

    movies_df = data.movies_df
    vectors = data.vectors
    exclude_ids = set(exclude_ids or [])

    idx = movies_df[movies_df["title"] == movie_title].index
    if len(idx) == 0:
        return None
    idx = idx[0]
    query_franchise = get_franchise_key(movie_title)

    distances = cosine_similarity(vectors[idx].reshape(1, -1), vectors)[0]

    candidates = sorted(list(enumerate(distances)), reverse=True, key=lambda x: x[1])[1:]
    candidates = [c for c in candidates if int(movies_df.iloc[c[0]].id) not in exclude_ids][:150]

    results = []
    franchise_counts = {}
    for i, score in candidates:
        row = movies_df.iloc[i]
        franchise = get_franchise_key(row.title)
        if franchise == query_franchise:
            franchise_counts[franchise] = franchise_counts.get(franchise, 0) + 1
            if franchise_counts[franchise] > max_per_franchise:
                continue
        results.append(build_movie_dict(row))
        if len(results) == n_results:
            break

    if include_wildcard and len(results) > 0:
        wildcard_candidates = candidates[50:150]
        wildcard_pool = [
            i for i, score in wildcard_candidates
            if get_franchise_key(movies_df.iloc[i].title) != query_franchise
        ]
        if wildcard_pool:
            wc_idx = random.choice(wildcard_pool)
            row = movies_df.iloc[wc_idx]
            results[-1] = build_movie_dict(row, wildcard=True)

    return results


def get_coldstart_recommendations(
    movie_titles: list,
    max_per_franchise: int = 2,
    n_results: int = 10,
    overlap: str = "normal",
    exclude_ids: list = None,):

    movies_df = data.movies_df
    vectors = data.vectors
    exclude_ids = set(exclude_ids or [])

    indices = movies_df[movies_df["title"].isin(movie_titles)].index
    if len(indices) == 0:
        return None

    user_vector = vectors[indices].mean(axis=0).reshape(1, -1)
    sim_scores = cosine_similarity(user_vector, vectors)[0]
    candidates = sorted(list(enumerate(sim_scores)), reverse=True, key=lambda x: x[1])
    candidates = [
        c for c in candidates
        if c[0] not in indices and int(movies_df.iloc[c[0]].id) not in exclude_ids
    ]

    start, end = OVERLAP_PRESETS.get(overlap, OVERLAP_PRESETS["normal"])
    candidates = candidates[start:end]

    results = []
    franchise_counts = {}
    seen_franchises_from_input = {get_franchise_key(t) for t in movie_titles}
    for i, score in candidates:
        row = movies_df.iloc[i]
        franchise = get_franchise_key(row.title)
        if franchise in seen_franchises_from_input:
            franchise_counts[franchise] = franchise_counts.get(franchise, 0) + 1
            if franchise_counts[franchise] > max_per_franchise:
                continue
        results.append(build_movie_dict(row))
        if len(results) == n_results:
            break

    return results


def get_watched_before_recommendations(
    movie_titles: list,
    max_per_director: int = 3,
    n_results: int = 24,
    keyword_weight: float = 0.6,
    exclude_ids: list = None,):

    movies_df = data.movies_df
    vectors = data.vectors
    keyword_vectors = data.keyword_vectors
    exclude_ids = set(exclude_ids or [])

    indices = movies_df[movies_df["title"].isin(movie_titles)].index
    if len(indices) == 0:
        return None

    user_content_vec = vectors[indices].mean(axis=0).reshape(1, -1)
    content_sim = cosine_similarity(user_content_vec, vectors)[0]

    user_keyword_vec = np.asarray(keyword_vectors[indices].mean(axis=0)).reshape(1, -1)
    keyword_sim = cosine_similarity(user_keyword_vec, keyword_vectors)[0]

    combined_scores = (1 - keyword_weight) * content_sim + (keyword_weight) * keyword_sim

    candidates = sorted(list(enumerate(combined_scores)), reverse=True, key=lambda x: x[1])
    candidates = [
        c for c in candidates
        if c[0] not in indices and int(movies_df.iloc[c[0]].id) not in exclude_ids
    ][:150]

    results = []
    director_counts = {}
    for i, score in candidates:
        row = movies_df.iloc[i]
        directors = get_director_keys(row)
        skip_movie = False
        for director in directors:
            if director_counts.get(director, 0) >= max_per_director:
                skip_movie = True
                break
        if skip_movie:
            continue
        for director in directors:
            director_counts[director] = director_counts.get(director, 0) + 1
        results.append(build_movie_dict(row))
        if len(results) == n_results:
            break

    return results