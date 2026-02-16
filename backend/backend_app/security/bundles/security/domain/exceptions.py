class AuthenticationError(Exception):
    pass


class AuthorizationError(Exception):
    def __init__(self, permission: str):
        super().__init__(f"Missing permission: {permission}")
        self.permission = permission
