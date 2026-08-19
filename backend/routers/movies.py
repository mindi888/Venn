from fastapi import APIRouter, Query, HTTPException

from core import data
from core.recommender import build_movie_dict
from schemas.movie import MovieOut

router = APIRouter()


@router.get("/search", response_model=list[MovieOut])
def search_movies(q: str = Query(..., min_length=1), limit: int = 10):
    """
    Title search for frontend autocomplete (picking movies for
    cold-start / watched-before flows).
    """
    movies_df = data.movies_df
    matches = movies_df[movies_df["title"].str.contains(q, case=False, na=False)]
    matches = matches.head(limit)
    return [build_movie_dict(row) for _, row in matches.iterrows()]


@router.get("/{movie_id}", response_model=MovieOut)
def get_movie(movie_id: int):
    movies_df = data.movies_df
    row = movies_df[movies_df["id"] == movie_id]
    if len(row) == 0:
        raise HTTPException(status_code=404, detail="Movie not found")
    return build_movie_dict(row.iloc[0])


@router.get("/random", response_model=list[MovieOut])
def get_random_movies(limit: int = Query(10, ge=1, le=50)):
    """Return a random selection of movies."""
    movies_df = data.movies_df
    # Don't sample more movies than there exists
    sample_size = min(limit, len(movies_df))
    random_movies = movies_df.sample(n=sample_size)

    return [
        build_movie_dict(row)
        for _, row in random_movies.iterrows()]


@router.get("/latest", response_model=list[MovieOut])
def get_latest_movies(limit: int = Query(10, ge=1, le=50)):
    """Return the most recently released movies."""

    movies_df = data.movies_df
    latest_movies = (
        movies_df
        .dropna(subset=["release_date"])
        .sort_values("release_date", ascending=False)
        .head(limit))

    return [
        build_movie_dict(row)
        for _, row in latest_movies.iterrows()]