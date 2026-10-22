import pytest
from fastapi.testclient import TestClient

from core import data
from main import app


@pytest.fixture(scope="session", autouse=True)
def client():
    # Entering the context runs the app's lifespan, which loads the joblib
    # artifacts once for the whole session (unit tests rely on this too)
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def top_titles():
    """Titles ordered by wr_score, best first — well-known, stable test inputs."""
    return data.movies_df.sort_values("wr_score", ascending=False)["title"].tolist()
