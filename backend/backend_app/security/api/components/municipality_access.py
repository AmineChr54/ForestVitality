"""
Municipality assignment model for restricting user access to specific regions.

Usage:
    - ADMIN and VIEWERS: Access all municipalities
    - FOREST_ANALYST: Only assigned municipalities
    - DATA_MANAGER: All municipalities for data management
"""

from typing import Optional, Set
from pydantic import BaseModel


class MunicipalityAssignment(BaseModel):
    """
    Represents which municipalities a user can access.
    
    Stored in Keycloak user attributes or separate database.
    """
    user_id: str
    assigned_municipalities: Set[str]  # Municipality IDs or names
    can_access_all: bool = False  # True for ADMIN, DATA_MANAGER, VIEWER


def get_accessible_municipalities(principal) -> Optional[Set[str]]:
    """
    Determine which municipalities the user can access.
    
    Returns:
        - None: User can access ALL municipalities (ADMIN, DATA_MANAGER, VIEWER)
        - Set[str]: Specific municipality IDs the user can access (FOREST_ANALYST)
    """
    
    # Admins, Data Managers, and Viewers have full access
    if "*" in principal.permissions or \
       "ADMIN" in principal.roles or \
       "DATA_MANAGER" in principal.roles or \
       "VIEWER" in principal.roles:
        return None  # No restrictions
    
    # Forest Analysts are restricted to assigned municipalities
    if "FOREST_ANALYST" in principal.roles:
        # TODO: Fetch from Keycloak user attributes or database
        # For now, extract from custom claims if configured
        municipalities = principal.metadata.get("assigned_municipalities", [])
        
        if not municipalities:
            # No assignments = no access
            return set()
        
        return set(municipalities)
    
    # Unknown role = no access
    return set()


def filter_by_municipality_access(data: list, principal, municipality_field: str = "municipality_id") -> list:
    """
    Filter data to only include items from accessible municipalities.
    
    Args:
        data: List of items to filter
        principal: Current user's principal object
        municipality_field: Field name containing municipality identifier
        
    Returns:
        Filtered list
    """
    accessible = get_accessible_municipalities(principal)
    
    # No restrictions
    if accessible is None:
        return data
    
    # Filter to only accessible municipalities
    return [
        item for item in data
        if item.get(municipality_field) in accessible
    ]


def assert_municipality_access(principal, municipality_id: str):
    """
    Raise exception if user cannot access the specified municipality.
    
    Raises:
        AuthorizationError: If user lacks access
    """
    accessible = get_accessible_municipalities(principal)
    
    # No restrictions
    if accessible is None:
        return
    
    # Check if municipality is accessible
    if municipality_id not in accessible:
        from backend_app.security.bundles.security.domain.exceptions import AuthorizationError
        raise AuthorizationError(
            f"Access denied to municipality: {municipality_id}. "
            f"You can only access: {', '.join(accessible)}"
        )
