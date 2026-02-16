# permission_mapper.py
"""
Permission system for Forest Vitality Platform.

Permissions are organized by resource:action format.
Example: "analysis:run", "data:ingest", "users:manage"
"""

ROLE_PERMISSION_MAP = {
    "ADMIN": {
        "*",  # Full access to everything
    },
    "FOREST_ANALYST": {
        # View and analyze forest data
        "analysis:read",
        "analysis:run",
        "analysis:export",
        "regions:read",
        "scenes:read",
        "indices:calculate",
        "reports:generate",
        "logs:create",  # Can save their own analysis logs
        "logs:read",    # Can read logs
    },
    "DATA_MANAGER": {
        # Manage satellite data
        "data:ingest",
        "data:delete",
        "scenes:read",
        "scenes:write",
        "scenes:metadata",
        "analysis:read",  # Limited analysis capabilities
        "regions:read",
        "logs:create",
        "logs:read",
    },
    "VIEWER": {
        # Read-only access
        "analysis:read",
        "regions:read",
        "scenes:read",
        "reports:view",
        "logs:read",
    },
}


class PermissionMapper:
    def map(self, roles: set[str]) -> set[str]:
        """
        Aggregate all permissions from user's roles.
        If user has multiple roles, they get the union of all permissions.
        """
        permissions = set()
        for role in roles:
            role_permissions = ROLE_PERMISSION_MAP.get(role, set())
            
            # If role has wildcard permission, grant all
            if "*" in role_permissions:
                return {"*"}
                
            permissions |= role_permissions
            
        return permissions
