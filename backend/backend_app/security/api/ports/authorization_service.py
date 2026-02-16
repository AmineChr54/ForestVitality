from abc import ABC, abstractmethod
from backend_app.security.bundles.security.domain.principal import Principal
from backend_app.security.bundles.security.domain.exceptions import AuthorizationError

class AuthorizationService(ABC):
    @abstractmethod
    def has_permission(self, principal: Principal, permission: str) -> bool:
        pass

    def assert_permission(self, principal: Principal, permission: str):
        if not self.has_permission(principal, permission):
            raise AuthorizationError(permission)
