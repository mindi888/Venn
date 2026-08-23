from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.data import load_artifacts
from routers import recommend, movies

# Modern lifespan setup
@asynccontextmanager
async def lifespan(app: FastAPI):
    load_artifacts() # Runs at startup
    yield

app = FastAPI(title="Venn API", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server default
        "http://localhost:3000",  # CRA default, in case
        "http://localhost:8443",  # Figma Make dev server
        "https://venn-movies.vercel.app", # Vercel link
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# @app.on_event("startup")
# def startup_event():
#     load_artifacts()


@app.get("/")
def root():
    return {"status": "ok", "message": "Venn API is running"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(recommend.router, prefix="/recommend", tags=["recommend"])
app.include_router(movies.router, prefix="/movies", tags=["movies"])
