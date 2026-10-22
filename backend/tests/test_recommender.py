"""Unit tests for the recommendation logic in core/recommender.py."""
import pytest

from core import data
from core.recommender import (
    get_franchise_key,
    get_director_keys,
    recommend,
    get_coldstart_recommendations,
    get_watched_before_recommendations,
)


# Must not be a real title — note "Nope" (2022) *is* in the dataset
FAKE = "Zzz Fake Title"


def ids(results):
    return [m["id"] for m in results]


def id_for(title):
    return int(data.movies_df.loc[data.movies_df["title"] == title, "id"].iloc[0])


# --- helpers ---------------------------------------------------------------

@pytest.mark.parametrize("title, expected", [
    ("Toy Story 3", "toy story"),
    ("The Dark Knight Rises", "the dark"),
    ("Spider-Man: Homecoming", "spiderman homecoming"),  # punctuation stripped
    ("A Quiet Place Part II", "quiet place"),             # leading article dropped
    ("An American Tail", "american tail"),
    ("Alien", "alien"),
])
def test_franchise_key(title, expected):
    assert get_franchise_key(title) == expected


@pytest.mark.parametrize("row, expected", [
    ({"director_list": [" Greta Gerwig ", "Noah Baumbach"]}, {"greta gerwig", "noah baumbach"}),
    ({"director_list": ["Bong Joon-ho", "", None]}, {"bong joon-ho"}),
    ({"director_list": "Christopher Nolan"}, {"christopher nolan"}),
    ({"director_list": None}, set()),
    ({}, set()),
])
def test_director_keys(row, expected):
    assert get_director_keys(row) == expected


# --- /recommend/similar ----------------------------------------------------

def test_similar_unknown_title_returns_none():
    assert recommend(FAKE) is None


def test_similar_returns_n_unique_results_without_the_query(top_titles):
    title = top_titles[0]
    results = recommend(title, n_results=24)
    assert len(results) == 24
    assert len(set(ids(results))) == 24
    assert id_for(title) not in ids(results)


def test_similar_respects_exclude_ids(top_titles):
    first = ids(recommend(top_titles[0], n_results=12, include_wildcard=False))
    second = ids(recommend(top_titles[0], n_results=12, include_wildcard=False, exclude_ids=first))
    assert len(second) == 12
    assert not set(first) & set(second)


@pytest.mark.parametrize("cap", [0, 1, 2])
def test_similar_caps_movies_from_the_same_franchise(cap):
    # Lord of the Rings has 5 films in the dataset, all very similar to each other
    title = "The Lord of the Rings: The Fellowship of the Ring"
    key = get_franchise_key(title)
    results = recommend(title, max_per_franchise=cap, n_results=30, include_wildcard=False)
    same_franchise = [m for m in results if get_franchise_key(m["title"]) == key]
    assert len(same_franchise) == cap


def test_similar_wildcard_replaces_last_slot_with_another_franchise(top_titles):
    title = "The Lord of the Rings: The Fellowship of the Ring"
    results = recommend(title, n_results=12, include_wildcard=True)
    flagged = [i for i, m in enumerate(results) if m.get("wildcard")]
    assert flagged == [len(results) - 1]
    assert get_franchise_key(results[-1]["title"]) != get_franchise_key(title)


def test_similar_without_wildcard_flags_nothing(top_titles):
    results = recommend(top_titles[0], n_results=12, include_wildcard=False)
    assert not any(m.get("wildcard") for m in results)


# --- /recommend/coldstart --------------------------------------------------

def test_coldstart_all_unknown_titles_returns_none():
    assert get_coldstart_recommendations([FAKE, FAKE + " 2"]) is None


def test_coldstart_never_recommends_the_input_movies(top_titles):
    picks = top_titles[:5]
    results = get_coldstart_recommendations(picks, n_results=24)
    assert len(results) == 24
    assert not {id_for(t) for t in picks} & set(ids(results))


def test_coldstart_ignores_unknown_titles_mixed_with_known(top_titles):
    picks = top_titles[:3]
    assert ids(get_coldstart_recommendations(picks + [FAKE])) == ids(get_coldstart_recommendations(picks))


def test_coldstart_overlap_presets_change_the_pool(top_titles):
    picks = top_titles[:3]
    tight, normal, loose = (
        ids(get_coldstart_recommendations(picks, n_results=24, overlap=o))
        for o in ("tight", "normal", "loose")
    )
    assert tight != normal != loose
    # An unrecognised preset falls back to "normal"
    assert ids(get_coldstart_recommendations(picks, n_results=24, overlap="bogus")) == normal


# --- /recommend/watched-before ---------------------------------------------

def test_watched_before_all_unknown_titles_returns_none():
    assert get_watched_before_recommendations([FAKE]) is None


@pytest.mark.parametrize("cap", [1, 2, 3])
def test_watched_before_caps_movies_per_director(top_titles, cap):
    results = get_watched_before_recommendations(top_titles[:5], max_per_director=cap, n_results=50)
    counts = {}
    for m in results:
        for d in m["director"]:
            counts[d.strip().lower()] = counts.get(d.strip().lower(), 0) + 1
    assert max(counts.values()) <= cap


def test_watched_before_never_recommends_the_input_movies(top_titles):
    picks = top_titles[:5]
    results = get_watched_before_recommendations(picks, n_results=50)
    assert not {id_for(t) for t in picks} & set(ids(results))


def test_watched_before_keyword_weight_changes_ranking(top_titles):
    picks = top_titles[:3]
    content_only = ids(get_watched_before_recommendations(picks, keyword_weight=0.0))
    keywords_only = ids(get_watched_before_recommendations(picks, keyword_weight=1.0))
    assert content_only != keywords_only
