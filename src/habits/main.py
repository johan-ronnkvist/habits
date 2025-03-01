from typing import Any

import fastapi
import uvicorn

app = fastapi.FastAPI()


@app.get("/")
def read_root() -> dict[str, Any]:
    return {"Hello": "World"}


if __name__ == "__main__":
    uvicorn.run(app, host="localhost", port=8000, reload=True)
