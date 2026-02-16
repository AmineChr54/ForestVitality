from abc import ABC, abstractmethod

class TokenValidator(ABC):
    @abstractmethod
    def validate(self, token: str) -> dict:
        """
        Validate JWT and return trusted claims.
        Raises AuthenticationError if invalid.
        """
