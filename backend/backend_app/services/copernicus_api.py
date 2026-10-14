import logging
import os
import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"

SEARCH_URL = "https://stac.dataspace.copernicus.eu/v1/search"

import time

logger = logging.getLogger(__name__)

class CopernicusAPIClient:

    def __init__(self):
        self.client_id = os.getenv("COPERNICUS_CLIENT_ID")
        self.client_secret = os.getenv("COPERNICUS_CLIENT_SECRET")
        self.username = os.getenv("COPERNICUS_USERNAME")
        self.password = os.getenv("COPERNICUS_PASSWORD")

        if not (self.client_id and self.client_secret) and not (self.username and self.password):
            raise ValueError("Missing Copernicus credentials (need Client ID/Secret OR Username/Password)")

        self._token = None
        self._token_expires_at = 0
        # Initialize token immediately
        self._refresh_token()

    @property
    def token(self):
        """Get a valid access token, refreshing if necessary."""
        if time.time() >= self._token_expires_at - 30:  # Refresh 30s before expiry
            self._refresh_token()
        return self._token

    def _refresh_token(self):
        if self.username and self.password:
            # Use Password Grant (User Context)
            data = {
                "grant_type": "password",
                "username": self.username,
                "password": self.password,
                "client_id": "cdse-public", # Standard public client for password flow
            }
            logger.info(f"Authenticating as user: {self.username}")
        else:
            # Use Client Credentials Grant
            data = {
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret
            }
            logger.info(f"Authenticating with Client ID: {self.client_id}")

        response = requests.post(TOKEN_URL, data=data)
        if response.status_code != 200:
            logger.error("Copernicus token request failed: %s", response.text)
            raise ValueError("Token request failed")

        json_resp = response.json()
        self._token = json_resp["access_token"]
        # Default to 600s if not provided
        expires_in = json_resp.get("expires_in", 600)
        self._token_expires_at = time.time() + expires_in
        logger.info(f"Refreshed Copernicus token (expires in {expires_in}s)")

    def _get_token(self):
        # Legacy method for compatibility if needed, but better to use property
        return self.token

    def search_scenes(self, bbox, date_from, date_to):
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        minLon, minLat, maxLon, maxLat = bbox
        polygon = {
        "type": "Polygon",
        "coordinates": [[
            [minLon, minLat],
            [maxLon, minLat],
            [maxLon, maxLat],
            [minLon, maxLat],
            [minLon, minLat]
        ]]
        }

        payload = {
            "collections": ["sentinel-2-l2a", "sentinel-2-l1c"],   # ✔ enforce Sentinel-2 only
            "bbox": bbox,
            "datetime": f"{date_from}T00:00:00Z/{date_to}T23:59:59Z",
            "limit": 20
        }

        response = requests.post(SEARCH_URL, json=payload, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Copernicus API search failed: {response.status_code}")
            return None
        
        result = response.json()
        scene_count = len(result.get('features', []))
        logger.info(f"Copernicus API returned {scene_count} scenes")
        return result

    def search_by_id(self, product_id: str):
        """Search for a specific scene by its Product ID (STAC ID)."""
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        payload = {
            "collections": ["sentinel-2-l2a", "sentinel-2-l1c"],
            "ids": [product_id]
        }
        
        response = requests.post(SEARCH_URL, json=payload, headers=headers)
        if response.status_code != 200:
            logger.error(f"Copernicus API ID search failed: {response.status_code}")
            return None
            
        return response.json()
