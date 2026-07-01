from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from services.drive_sync import start_sync_service

# Trigger reload
app = FastAPI(title="AI Photo Retrieval System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from models.database import seed_admin_user

@app.on_event("startup")
async def startup_event():
    seed_admin_user()
    start_sync_service()

app.include_router(router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
