from pydantic import BaseModel
from typing import Optional, Dict, Any, Literal
from datetime import date


class AreaInput(BaseModel):
    type: Literal["municipality", "polygon"]
    name: Optional[str] = None
    geometry: Optional[Dict[str, Any]] = None


class AnalysisRequest(BaseModel):
    area: AreaInput
    index: Literal["NDVI", "NDMI", "EVI"]
    from_date: date
    to_date: date
