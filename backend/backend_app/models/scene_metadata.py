from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any
from datetime import datetime


class Band(BaseModel):
    name: str
    href: str


class SceneMetadata(BaseModel):
    id: str = Field(..., description="Scene ID")

    product_id: str

    acquisition_date: datetime

    cloud_coverage: float = Field(..., ge=0, le=100)

    # Example valid tile ids: 31TCJ, 32TLP, 30UXC
    tile_id: str = Field(..., pattern=r"^[0-9]{2}[A-Z]{3}$|^UNKNOWN$")

    footprint: Dict[str, Any]

    bands: List[Band]

    processing_level: str = Field(..., pattern=r"^(L1C|L2A)$")

    @field_validator("bands")
    def ensure_minimum_bands(cls, v):
        if len(v) < 2:
            raise ValueError("At least two bands are required (e.g., RED + NIR).")
        return v
