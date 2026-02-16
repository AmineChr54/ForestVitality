from pydantic import BaseModel

class LogModel(BaseModel):
    message: str
    level: str | None = "info"
    timestamp: str | None = None
