from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.data import load_artifacts
from routers import recommend, movies

app = FastAPI(title="Pop a Seat API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server default
        "http://localhost:3000",  # CRA default, in case
        "http://localhost:8443",  # Figma Make dev server
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    load_artifacts()


@app.get("/")
def root():
    return {"status": "ok", "message": "Pop a Seat API is running"}


app.include_router(recommend.router, prefix="/recommend", tags=["recommend"])
app.include_router(movies.router, prefix="/movies", tags=["movies"])
