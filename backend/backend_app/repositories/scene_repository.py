from backend_app.repositories.opensearch_repository import get_client
from backend_app.models.scene_metadata import SceneMetadata
from typing import Optional, List, Dict, Any

SCENE_INDEX = "scenes"


class SceneRepository:

    def __init__(self):
        self.client = get_client()
        self._ensure_scene_index()

    def _ensure_scene_index(self):
        if not self.client.indices.exists(index=SCENE_INDEX):
            self.client.indices.create(
                index=SCENE_INDEX,
                body={
                    "mappings": {
                        "properties": {
                            "id": {"type": "keyword"},
                            "product_id": {"type": "keyword"},
                            "acquisition_date": {"type": "date"},
                            "cloud_coverage": {"type": "float"},
                            "tile_id": {"type": "keyword"},
                            "footprint": {"type": "geo_shape"},
                            "bands": {
                                "type": "nested",
                                "properties": {
                                    "name": {"type": "keyword"},
                                    "href": {"type": "keyword"},
                                    "s3_path": {"type": "keyword"}  # S3/MinIO path
                                }
                            },
                            "processing_level": {"type": "keyword"}
                        }
                    }
                }
            )

    def store_scene(self, scene: SceneMetadata):
        """Store a scene's metadata in OpenSearch."""
        self.client.index(
            index=SCENE_INDEX,
            id=scene.id,
            body=scene.model_dump()
        )

    def get_by_id(self, scene_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a scene by its ID from OpenSearch."""
        try:
            response = self.client.get(index=SCENE_INDEX, id=scene_id)
            return response["_source"]
        except Exception:
            return None


    def update_band_s3_path(self, scene_id: str, band_name: str, s3_path: str):
        """Update the S3 path for a specific band after upload to MinIO."""
        script = {
            "source": """
                for (int i = 0; i < ctx._source.bands.size(); i++) {
                    if (ctx._source.bands[i].name == params.name) {
                        ctx._source.bands[i].s3_path = params.path;
                    }
                }
            """,
            "lang": "painless",
            "params": {"name": band_name, "path": s3_path}
        }
        self.client.update(index=SCENE_INDEX, id=scene_id, body={"script": script})

    def update_scene_cog_path(self, scene_id: str, cog_path: str):
        """Update the multi-band COG S3 path for a scene."""
        self.client.update(
            index=SCENE_INDEX,
            id=scene_id,
            body={
                "doc": {"scene_cog_path": cog_path}
            }
        )

    def get_scene(self, scene_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a scene by its ID."""
        try:
            response = self.client.get(index=SCENE_INDEX, id=scene_id)
            return response["_source"] if response.get("found", True) else None
        except Exception:
            return None

    def search_scenes_by_geometry(
        self, 
        geometry: Dict[str, Any], 
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        max_cloud_cover: float = 100.0
    ) -> List[Dict[str, Any]]:
        """
        Search for scenes that intersect with the given GeoJSON geometry.
        Optionally filter by date range and cloud coverage.
        """
        # Convert BBox list to OpenSearch envelope if needed
        shape_query = geometry
        if isinstance(geometry, list) and len(geometry) == 4:
            # BBox: [min_lon, min_lat, max_lon, max_lat]
            # Envelope: [[minLon, maxLat], [maxLon, minLat]] (TopLeft, BottomRight)
            shape_query = {
                "type": "envelope",
                "coordinates": [
                    [geometry[0], geometry[3]], # Top Left
                    [geometry[2], geometry[1]]  # Bottom Right
                ]
            }

        must_clauses = [
            {
                "geo_shape": {
                    "footprint": {
                        "shape": shape_query,
                        "relation": "intersects"
                    }
                }
            },
            {"range": {"cloud_coverage": {"lte": max_cloud_cover}}}
        ]
        
        if start_date or end_date:
            date_range = {}
            if start_date:
                date_range["gte"] = start_date
            if end_date:
                date_range["lte"] = end_date
            must_clauses.append({"range": {"acquisition_date": date_range}})
        
        query = {"bool": {"must": must_clauses}}
        
        response = self.client.search(
            index=SCENE_INDEX,
            body={"query": query, "size": 100}
        )
        
        return [hit["_source"] for hit in response["hits"]["hits"]]


# --- Module-level helper functions ---

_repo_instance = None

def _get_repo() -> SceneRepository:
    global _repo_instance
    if _repo_instance is None:
        _repo_instance = SceneRepository()
    return _repo_instance

def get_scene_by_id(scene_id: str) -> Optional[Dict[str, Any]]:
    """Get a scene by its ID. Returns None if not found."""
    repo = _get_repo()
    return repo.get_by_id(scene_id)

