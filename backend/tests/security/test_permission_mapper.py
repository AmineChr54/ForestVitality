from backend_app.security.api.components.permission_mapper import PermissionMapper


mapper = PermissionMapper()


def test_permission_mapper_grants_admin_wildcard():
    permissions = mapper.map({"ADMIN"})

    assert permissions == {"*"}


def test_permission_mapper_unions_permissions_across_roles():
    permissions = mapper.map({"FOREST_ANALYST", "VIEWER"})

    assert "analysis:run" in permissions
    assert "reports:view" in permissions
    assert "regions:read" in permissions


def test_permission_mapper_unknown_role_returns_empty_set():
    permissions = mapper.map({"NON_EXISTING_ROLE"})

    assert permissions == set()
