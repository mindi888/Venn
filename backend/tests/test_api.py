"""HTTP-level tests: routing, validation, status codes and response shape."""
import pytest

from core import data

# Must not be a real title — note "Nope" (2022) *is* in the dataset
FAKE = "Zzz Fake Title"

MOVIE_FIELDS = {
    "id", "title", "poster_path", "runtime", "vote_average", "release_date",
    "genres", "overview", "tagline", "cast", "director", "wildcard",
}


def test_root_and_health(client):
    assert client.get("/").json()["status"] == "ok"
    assert client.get("/health").json() == {"status": "ok"}


# --- /movies ---------------------------------------------------------------

def test_search_is_case_insensitive_and_limited(client):
    res = client.get("/movies/search", params={"q": "DARK", "limit": 5})
    assert res.status_code == 200
    movies = res.json()
    assert 0 < len(movies) <= 5
    assert all("dark" in m["title"].lower() for m in movies)
    assert set(movies[0]) == MOVIE_FIELDS


def test_search_requires_a_query(client):
    assert client.get("/movies/search").status_code == 422
    assert client.get("/movies/search", params={"q": ""}).status_code == 422


@pytest.mark.parametrize("path", ["/movies/random", "/movies/latest", "/movies/top-rated"])
def test_list_routes_are_not_swallowed_by_movie_id_route(client, path):
    # /movies/{movie_id} is declared last; if it weren't, these would 422 on int parsing
    res = client.get(path, params={"limit": 5})
    assert res.status_code == 200
    assert len(res.json()) == 5


@pytest.mark.parametrize("limit", [0, 51])
def test_list_routes_reject_out_of_range_limits(client, limit):
    assert client.get("/movies/random", params={"limit": limit}).status_code == 422


def test_latest_is_sorted_newest_first(client):
    dates = [m["release_date"] for m in client.get("/movies/latest", params={"limit": 10}).json()]
    assert dates == sorted(dates, reverse=True)


def test_top_rated_follows_weighted_score(client):
    expected = data.movies_df.sort_values("wr_score", ascending=False)["id"].head(10).tolist()
    got = [m["id"] for m in client.get("/movies/top-rated", params={"limit": 10}).json()]
    assert got == expected


def test_get_movie_by_id(client):
    movie_id = int(data.movies_df["id"].iloc[0])
    res = client.get(f"/movies/{movie_id}")
    assert res.status_code == 200
    assert res.json()["id"] == movie_id


def test_get_unknown_movie_is_404(client):
    res = client.get("/movies/999999999")
    assert res.status_code == 404
    assert res.json()["detail"] == "Movie not found"


# --- /recommend ------------------------------------------------------------

def test_similar_endpoint(client, top_titles):
    res = client.post("/recommend/similar", json={"movie_title": top_titles[0], "n_results": 12})
    assert res.status_code == 200
    assert len(res.json()) == 12
    assert set(res.json()[0]) == MOVIE_FIELDS


def test_similar_unknown_title_is_404(client):
    res = client.post("/recommend/similar", json={"movie_title": FAKE})
    assert res.status_code == 404
    assert FAKE in res.json()["detail"]


def test_coldstart_endpoint(client, top_titles):
    res = client.post("/recommend/coldstart", json={"movie_titles": top_titles[:3], "overlap": "tight"})
    assert res.status_code == 200
    assert len(res.json()) == 18  # schema default n_results


def test_watched_before_endpoint_unknown_titles_is_404(client):
    assert client.post("/recommend/watched-before", json={"movie_titles": [FAKE]}).status_code == 404


@pytest.mark.parametrize("path, body", [
    ("/recommend/similar", {"movie_title": "Up", "n_results": 51}),             # le=50
    ("/recommend/similar", {}),                                                 # missing title
    ("/recommend/coldstart", {"movie_titles": ["Up"], "overlap": "medium"}),    # not a preset
    ("/recommend/watched-before", {"movie_titles": ["Up"], "keyword_weight": 1.5}),  # le=1.0
    ("/recommend/watched-before", {"movie_titles": ["Up"], "n_results": 101}),  # le=100
])
def test_recommend_validation_errors(client, path, body):
    assert client.post(path, json=body).status_code == 422
