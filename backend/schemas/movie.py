from pydantic import BaseModel, Field
from typing import Optional, Literal


class MovieOut(BaseModel):
    id: int
    title: str
    poster_path: Optional[str] = None
    runtime: Optional[float] = None
    vote_average: float
    release_date: str
    genres: list[str]
    overview: str
    tagline: Optional[str] = None
    cast: list[str]
    director: list[str]
    wildcard: Optional[bool] = None


class RecommendRequest(BaseModel):
    movie_title: str
    max_per_franchise: int = 2
    n_results: int = Field(default=12, le=50)
    include_wildcard: bool = True
    exclude_ids: list[int] = []


class ColdstartRequest(BaseModel):
    movie_titles: list[str]
    max_per_franchise: int = 2
    n_results: int = Field(default=24, le=50)
    overlap: Literal["tight", "normal", "loose"] = "normal"
    exclude_ids: list[int] = []


class WatchedBeforeRequest(BaseModel):
    movie_titles: list[str]
    max_per_director: int = 3
    n_results: int = Field(default=24, le=100)
    keyword_weight: float = Field(default=0.6, ge=0.0, le=1.0)
    exclude_ids: list[int] = []
