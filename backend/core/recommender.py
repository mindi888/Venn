"""
Recommendation logic — adapted from the notebook.
Uses movies_df, vectors, keyword_vectors (and the lookups precomputed
alongside them) loaded in core.data at app startup.
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


def _unit(v):
    # L2-normalize a vector; an all-zero vector stays zero (scores all 0), like sklearn
    norm = np.linalg.norm(v)
    return v / norm if norm else v


def _rank(scores):
    # Row positions by descending score; stable so ties keep row order,
    # matching sorted(..., reverse=True)
    return np.argsort(-scores, kind="stable")


def _drop(order, exclude_ids, skip_indices=()):
    # Remove excluded movie ids (and the input movies themselves) from a ranking
    mask = ~np.isin(data.ids[order], list(exclude_ids))
    if len(skip_indices):
        mask &= ~np.isin(order, skip_indices)
    return order[mask]


def _indices_for_titles(movie_titles):
    # Every row whose title is in movie_titles, in row order (same as df["title"].isin)
    return sorted({i for t in movie_titles for i in data.title_to_indices.get(t, [])})


def _profile_vector(indices):
    # Mean of the raw (un-normalized) content vectors for these rows, as a unit vector
    raw = data.vectors[indices] * data.vector_norms[indices, None]
    return _unit(raw.mean(axis=0))


def recommend(
    movie_title: str,
    max_per_franchise: int = 2,
    n_results: int = 10,
    include_wildcard: bool = True,
    exclude_ids: list = None,):

    movies_df = data.movies_df
    vectors = data.vectors
    exclude_ids = set(exclude_ids or [])

    idx = data.title_to_indices.get(movie_title)
    if not idx:
        return None
    idx = idx[0]
    query_franchise = get_franchise_key(movie_title)

    # vectors rows are unit-length, so the dot product is cosine similarity
    distances = vectors @ vectors[idx]

    candidates = _rank(distances)[1:]
    candidates = _drop(candidates, exclude_ids)[:150]

    results = []
    franchise_counts = {}
    for i in candidates:
        franchise = get_franchise_key(data.titles[i])
        if franchise == query_franchise:
            franchise_counts[franchise] = franchise_counts.get(franchise, 0) + 1
            if franchise_counts[franchise] > max_per_franchise:
                continue
        results.append(build_movie_dict(movies_df.iloc[i]))
        if len(results) == n_results:
            break

    if include_wildcard and len(results) > 0:
        wildcard_candidates = candidates[50:150]
        wildcard_pool = [
            i for i in wildcard_candidates
            if get_franchise_key(data.titles[i]) != query_franchise
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

    indices = _indices_for_titles(movie_titles)
    if len(indices) == 0:
        return None

    sim_scores = vectors @ _profile_vector(indices)
    candidates = _drop(_rank(sim_scores), exclude_ids, skip_indices=indices)

    start, end = OVERLAP_PRESETS.get(overlap, OVERLAP_PRESETS["normal"])
    candidates = candidates[start:end]

    results = []
    franchise_counts = {}
    seen_franchises_from_input = {get_franchise_key(t) for t in movie_titles}
    for i in candidates:
        franchise = get_franchise_key(data.titles[i])
        if franchise in seen_franchises_from_input:
            franchise_counts[franchise] = franchise_counts.get(franchise, 0) + 1
            if franchise_counts[franchise] > max_per_franchise:
                continue
        results.append(build_movie_dict(movies_df.iloc[i]))
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

    indices = _indices_for_titles(movie_titles)
    if len(indices) == 0:
        return None

    content_sim = vectors @ _profile_vector(indices)

    # keyword_vectors is small and sparse, so sklearn is already fast (<1ms) here
    user_keyword_vec = np.asarray(keyword_vectors[indices].mean(axis=0)).reshape(1, -1)
    keyword_sim = cosine_similarity(user_keyword_vec, keyword_vectors)[0]

    combined_scores = (1 - keyword_weight) * content_sim + (keyword_weight) * keyword_sim

    candidates = _drop(_rank(combined_scores), exclude_ids, skip_indices=indices)[:150]

    results = []
    director_counts = {}
    for i in candidates:
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