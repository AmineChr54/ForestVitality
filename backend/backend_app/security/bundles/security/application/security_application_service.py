from backend_app.security.bundles.security.domain.exceptions import AuthorizationError

class SecurityApplicationService:
    def __init__(self, token_validator, token_mapper):
        self.token_validator = token_validator
        self.token_mapper = token_mapper

    def authenticate(self, token: str):
        """Validate token and return Principal with roles and permissions"""
        claims = self.token_validator.validate(token)
        return self.token_mapper.to_principal(claims)
    
    def assert_permission(self, principal, permission: str):
        """
        Assert that principal has the required permission.
        Raises AuthorizationError if permission is missing.
        
        Args:
            principal: User's principal object
            permission: Required permission string (e.g., 'analysis:run')
        """
        # Admin wildcard permission grants everything
        if "*" in principal.permissions:
            return
        
        # Check if user has the specific permission
        if permission not in principal.permissions:
            raise AuthorizationError(permission)
