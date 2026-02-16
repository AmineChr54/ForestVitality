from dataclasses import dataclass
from typing import Set, Optional, Dict, Any

@dataclass(frozen=True)
class Principal:
    user_id: str  # Unique user identifier (sub from JWT)
    username: str  # Username for display
    roles: Set[str]  # User's roles (ADMIN, FOREST_ANALYST, etc.)
    permissions: Set[str]  # User's permissions (analysis:run, data:ingest, etc.)
    metadata: Dict[str, Any] = None  # Additional user data (email, assigned municipalities, etc.)
    
    def __post_init__(self):
        # Ensure metadata is initialized
        if self.metadata is None:
            object.__setattr__(self, 'metadata', {})
