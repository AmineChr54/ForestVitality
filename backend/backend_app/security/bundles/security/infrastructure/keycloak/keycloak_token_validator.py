# keycloak_token_validator.py
from jose import jwt
from backend_app.security.api.ports.token_validator import TokenValidator
from backend_app.security.bundles.security.domain.exceptions import AuthenticationError


class KeycloakTokenValidator(TokenValidator):
    def __init__(self, jwks_client, issuer: str, client_id: str):
        self.jwks_client = jwks_client
        self.issuer = issuer
        self.client_id = client_id

    def validate(self, token: str) -> dict:
        try:
            unverified_header = jwt.get_unverified_header(token)
            key = self.jwks_client.get_signing_key(unverified_header["kid"])

            claims = jwt.decode(
                token,
                key,
                algorithms=["RS256"],
                issuer=self.issuer,
                options={"verify_aud": False},  # IMPORTANT (Keycloak quirk)
            )

            # Keycloak-specific check
            if claims.get("azp") != self.client_id:
                raise AuthenticationError("Invalid authorized party")

            return claims

        except Exception as exc:
            # print(f"❌ DEBUG: Token validation failed: {exc}") # Optional: keep console print
            raise AuthenticationError(str(exc)) from exc
