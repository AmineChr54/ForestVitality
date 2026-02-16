# role_mapper.py
import os

# Standardized internal role names
DOMAIN_ROLES = {
    "ADMIN",              # System Administrator
    "FOREST_ANALYST",     # Forest health analyst
    "DATA_MANAGER",       # Satellite data manager
    "VIEWER"              # Read-only viewer
}

# Map Keycloak role names to internal role names
# Supports various naming conventions from Keycloak
KEYCLOAK_ROLE_MAPPING = {
    # Admin variants
    "administrator": "ADMIN",
    "admin": "ADMIN",
    "ADMIN": "ADMIN",
    "Administrator": "ADMIN",
    
    # Forest Analyst variants
    "forest analyst": "FOREST_ANALYST",
    "forest-analyst": "FOREST_ANALYST",
    "forest_analyst": "FOREST_ANALYST",  # With underscore (Keycloak default)
    "FOREST_ANALYST": "FOREST_ANALYST",
    "Forest Analyst": "FOREST_ANALYST",
    "Forest analyzer": "FOREST_ANALYST",  # User's typo in role mapping
    
    # Data Manager variants
    "data manager": "DATA_MANAGER",
    "data-manager": "DATA_MANAGER",
    "data_manager": "DATA_MANAGER",  # With underscore (Keycloak default)
    "DATA_MANAGER": "DATA_MANAGER",
    "Data Manager": "DATA_MANAGER",
    
    # Viewer variants
    "viewer": "VIEWER",
    "VIEWER": "VIEWER",
    "Viewer": "VIEWER",
}


class RoleMapper:
    def map(self, claims: dict) -> set[str]:
        """
        Extract and validate roles from Keycloak token claims.
        Maps Keycloak role names to internal standardized role names.
        Supports both realm_access and resource_access roles.
        """
        keycloak_roles = []
        
        # Realm-level roles
        realm_roles = claims.get("realm_access", {}).get("roles", [])
        keycloak_roles.extend(realm_roles)
        
        # Client-specific roles (configurable via env)
        _client_ids = os.getenv(
            "KEYCLOAK_RESOURCE_CLIENT_IDS", "forest-vitality,geo-platform-backend"
        ).split(",")
        resource_access = claims.get("resource_access", {})
        for client_id in _client_ids:
            client_roles = resource_access.get(client_id.strip(), {}).get("roles", [])
            keycloak_roles.extend(client_roles)
        
        # Map Keycloak roles to internal roles
        internal_roles = set()
        for keycloak_role in keycloak_roles:
            internal_role = KEYCLOAK_ROLE_MAPPING.get(keycloak_role)
            if internal_role:
                internal_roles.add(internal_role)
        
        return internal_roles
