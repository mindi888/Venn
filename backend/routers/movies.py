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
