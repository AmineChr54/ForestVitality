from backend_app.security.api.components.role_mapper import RoleMapper


mapper = RoleMapper()


def test_role_mapper_maps_realm_roles_variants():
    claims = {
        "realm_access": {
            "roles": ["administrator", "forest_analyst", "unknown_role"]
        }
    }

    roles = mapper.map(claims)

    assert roles == {"ADMIN", "FOREST_ANALYST"}


def test_role_mapper_reads_roles_from_configured_resource_clients(monkeypatch):
    monkeypatch.setenv("KEYCLOAK_RESOURCE_CLIENT_IDS", "forest-vitality,geo-platform-backend")
    claims = {
        "resource_access": {
            "forest-vitality": {"roles": ["viewer"]},
            "geo-platform-backend": {"roles": ["data_manager"]},
        }
    }

    roles = mapper.map(claims)

    assert roles == {"VIEWER", "DATA_MANAGER"}


def test_role_mapper_ignores_unmapped_roles():
    claims = {"realm_access": {"roles": ["offline_access", "uma_authorization"]}}

    roles = mapper.map(claims)

    assert roles == set()
