from fastapi import APIRouter, HTTPException

from core.recommender import (
    recommend,
    get_coldstart_recommendations,
    get_watched_before_recommendations,
)
from schemas.movie import (
    RecommendRequest,
    ColdstartRequest,
    WatchedBeforeRequest,
    MovieOut,
)

router = APIRouter()


@router.post("/similar", response_model=list[MovieOut])
def similar_movies(req: RecommendRequest):
    results = recommend(
        movie_title=req.movie_title,
        max_per_franchise=req.max_per_franchise,
        n_results=req.n_results,
        include_wildcard=req.include_wildcard,
    )
    if results is None:
        raise HTTPException(status_code=404, detail=f"Movie '{req.movie_title}' not found")
    return results


@router.post("/coldstart", response_model=list[MovieOut])
def coldstart(req: ColdstartRequest):
    results = get_coldstart_recommendations(
        movie_titles=req.movie_titles,
        max_per_franchise=req.max_per_franchise,
        n_results=req.n_results,
    )
    if results is None:
        raise HTTPException(status_code=404, detail="None of the provided movie titles were found")
    return results


@router.post("/watched-before", response_model=list[MovieOut])
def watched_before(req: WatchedBeforeRequest):
    results = get_watched_before_recommendations(
        movie_titles=req.movie_titles,
        max_per_director=req.max_per_director,
        n_results=req.n_results,
        keyword_weight=req.keyword_weight,
    )
    if results is None:
        raise HTTPException(status_code=404, detail="None of the provided movie titles were found")
    return results
