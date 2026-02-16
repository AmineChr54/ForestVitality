# keycloak_token_mapper.py
class KeycloakTokenMapper:
    def __init__(self, role_mapper, permission_mapper, user_mapper):
        self.role_mapper = role_mapper
        self.permission_mapper = permission_mapper
        self.user_mapper = user_mapper

    def to_principal(self, claims: dict):
        roles = self.role_mapper.map(claims)
        permissions = self.permission_mapper.map(roles)
        return self.user_mapper.map(claims, roles, permissions)
