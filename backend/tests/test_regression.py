"""
Regression test pinning the recommender's output.

fixtures/recommendations_before_refactor.json holds the results the original
(pre-optimization) recommender returned for 394 cases, recorded on macOS. On
macOS the optimized version reproduces all of them exactly, including the
random wildcard pick when `random` is seeded the same way.

Exact order isn't portable, though: Linux's BLAS (OpenBLAS) rounds float32 sums
differently from macOS's Accelerate, so movies whose scores tie to ~1e-8 can
swap places — the *original* code fails an exact comparison on Linux in 22/394
cases. So instead of exact equality we require:
  - per case: same length, and at least MIN_OVERLAP of the same movies
  - overall: at least MIN_EXACT of cases identical (100% on macOS, ~94% on Linux)
A real ranking bug shifts nearly every case and fails the second check.

If you change ranking behaviour on purpose, regenerate the fixture with:

    UPDATE_GOLDEN=1 pytest tests/test_regression.py
"""
import json
import os
import random
from pathlib import Path

import pytest

from core import data
from core import recommender as r

FIXTURE = Path(__file__).parent / "fixtures" / "recommendations_before_refactor.json"
MIN_OVERLAP = 0.85
MIN_EXACT = 0.90


def run_cases():
    df = data.movies_df
    top = df.sort_values("wr_score", ascending=False)["title"].tolist()
    dups = df[df.title.duplicated(keep=False)].title.unique().tolist()
    rng = random.Random(42)
    singles = top[:20] + dups[:10] + rng.sample(df.title.tolist(), 15) + ["Not A Real Movie"]
    excl = [int(x) for x in df.id.sample(200, random_state=1)]
    out = {}

    def run(key, fn, *a, **k):
        random.seed(123)
        res = fn(*a, **k)
        out[key] = None if res is None else [[m["id"], bool(m.get("wildcard"))] for m in res]

    for t in singles:
        for ex in ([], excl):
            run(f"sim|{t}|{len(ex)}", r.recommend, t, n_results=24, exclude_ids=ex)
            run(f"sim1|{t}|{len(ex)}", r.recommend, t, max_per_franchise=1, n_results=50,
                include_wildcard=False, exclude_ids=ex)
    groups = [top[i:i + 3] for i in range(0, 30, 3)] + [
        dups[:3], dups[3:8], rng.sample(df.title.tolist(), 6), ["Nope", top[0]], ["Nope"],
    ]
    for g in groups:
        for ex in ([], excl):
            for ov in ("tight", "normal", "loose"):
                run(f"cold|{g}|{ov}|{len(ex)}", r.get_coldstart_recommendations, g,
                    n_results=24, overlap=ov, exclude_ids=ex)
            for kw in (0.3, 0.6, 0.0, 1.0):
                run(f"wb|{g}|{kw}|{len(ex)}", r.get_watched_before_recommendations, g,
                    n_results=50, keyword_weight=kw, exclude_ids=ex)
    return out


@pytest.fixture(scope="module")
def actual():
    return run_cases()


def test_fixture_covers_every_case(actual):
    if os.environ.get("UPDATE_GOLDEN"):
        FIXTURE.write_text(json.dumps(actual, separators=(",", ":"), sort_keys=True))
    expected = json.loads(FIXTURE.read_text())
    assert set(actual) == set(expected)


def test_every_case_returns_mostly_the_same_movies(actual):
    expected = json.loads(FIXTURE.read_text())
    drifted = []
    for key, exp in expected.items():
        got = actual[key]
        if exp is None or got is None:
            if exp != got:
                drifted.append(key)
            continue
        shared = len({m for m, _ in exp} & {m for m, _ in got})
        if len(got) != len(exp) or shared < MIN_OVERLAP * len(exp):
            drifted.append(key)
    assert not drifted, f"{len(drifted)} cases drifted beyond tie-swaps, e.g. {drifted[:3]}"


def test_most_cases_match_exactly(actual):
    expected = json.loads(FIXTURE.read_text())
    exact = sum(actual[k] == expected[k] for k in expected)
    assert exact >= MIN_EXACT * len(expected), f"only {exact}/{len(expected)} cases identical"
