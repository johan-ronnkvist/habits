import os.path

import fastapi
import structlog
import uvicorn
from fastapi.staticfiles import StaticFiles

import habits.router.auth as auth

logger = structlog.get_logger()

app = fastapi.FastAPI()
app.mount(
    "/",
    StaticFiles(
        directory=os.path.join(os.path.dirname(__file__), "..", "site"), html=True
    ),
    name="static",
)

app.include_router(auth.router)


def run():
    logger.debug("Starting server")
    uvicorn.run(app, host="localhost", port=8000)


if __name__ == "__main__":
    run()
