# keycloak_jwks_client.py
import httpx
from jose import jwk
from jose.utils import base64url_decode


class KeycloakJwksClient:
    def __init__(self, jwks_url: str):
        self.jwks_url = jwks_url
        self._jwks = None

    def _load_jwks(self):
        response = httpx.get(self.jwks_url)
        response.raise_for_status()
        self._jwks = response.json()["keys"]

    def get_signing_key(self, kid: str):
        if self._jwks is None:
            self._load_jwks()

        for key in self._jwks:
            if key["kid"] == kid:
                return key

        # Refresh once in case of key rotation
        self._load_jwks()
        for key in self._jwks:
            if key["kid"] == kid:
                return key

        raise Exception(f"No matching JWKS key for kid={kid}")
