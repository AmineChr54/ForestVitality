from abc import ABC, abstractmethod
from backend_app.security.bundles.security.domain.principal import Principal

class UserContextProvider(ABC):
    @abstractmethod
    def get_current_principal(self) -> Principal:
        pass
