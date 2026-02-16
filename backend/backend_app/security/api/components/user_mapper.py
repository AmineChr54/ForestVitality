# user_mapper.py
from backend_app.security.bundles.security.domain.principal import Principal


class UserMapper:
    def map(self, claims: dict, roles: set[str], permissions: set[str]) -> Principal:
        """
        Map JWT claims to Principal domain object.
        
        Extracts user information from Keycloak token and creates Principal
        with user_id, username, roles, permissions, and additional metadata.
        """
        # Extract metadata
        metadata = {
            "email": claims.get("email"),
            "name": claims.get("name"),
            "given_name": claims.get("given_name"),
            "family_name": claims.get("family_name"),
            "email_verified": claims.get("email_verified", False),
            # Extract custom attributes if present
            "assigned_municipalities": claims.get("assigned_municipalities", []),
        }
        
        return Principal(
            user_id=claims["sub"],  # Unique user ID from JWT 'sub' claim
            username=claims.get("preferred_username", "unknown"),
            roles=roles,
            permissions=permissions,
            metadata=metadata,
        )
