"""
FastAPI dependency decorators for permission-based authorization.

Usage:
    @router.get("/analysis")
    @require_permission("analysis:read")
    def get_analysis(principal = Depends(get_current_principal)):
        ...
"""

from functools import wraps
from typing import Callable
from fastapi import Depends
from backend_app.security.http.security_dependencies import (
    get_current_principal,
    security_service,
)
from backend_app.security.bundles.security.domain.principal import Principal


def require_permission(permission: str):
    """
    Decorator to require specific permission for an endpoint.
    
    Example:
        @router.get("/data")
        @require_permission("data:read")
        def get_data(principal = Depends(get_current_principal)):
            return {"data": "..."}
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, principal: Principal = Depends(get_current_principal), **kwargs):
            security_service.assert_permission(principal, permission)
            return await func(*args, principal=principal, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, principal=principal, **kwargs)
        return wrapper
    return decorator


def require_any_permission(*permissions: str):
    """
    Decorator to require ANY of the specified permissions.
    User needs at least one.
    
    Example:
        @router.get("/dashboard")
        @require_any_permission("dashboard:admin", "dashboard:analyst")
        def dashboard(principal = Depends(get_current_principal)):
            return {"data": "..."}
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, principal: Principal = Depends(get_current_principal), **kwargs):
            for permission in permissions:
                try:
                    security_service.assert_permission(principal, permission)
                    # If one succeeds, allow access
                    return await func(*args, principal=principal, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, principal=principal, **kwargs)
                except:
                    continue
            # None succeeded
            from backend_app.security.bundles.security.domain.exceptions import AuthorizationError
            raise AuthorizationError(f"Requires one of: {', '.join(permissions)}")
        return wrapper
    return decorator


def require_all_permissions(*permissions: str):
    """
    Decorator to require ALL specified permissions.
    
    Example:
        @router.delete("/data")
        @require_all_permissions("data:delete", "admin:privilege")
        def delete_data(principal = Depends(get_current_principal)):
            return {"status": "deleted"}
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, principal: Principal = Depends(get_current_principal), **kwargs):
            for permission in permissions:
                security_service.assert_permission(principal, permission)
            return await func(*args, principal=principal, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, principal=principal, **kwargs)
        return wrapper
    return decorator


def require_role(role: str):
    """
    Decorator to require a specific role.
    
    Example:
        @router.post("/users")
        @require_role("ADMIN")
        def create_user(principal = Depends(get_current_principal)):
            return {"status": "created"}
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, principal: Principal = Depends(get_current_principal), **kwargs):
            if role not in principal.roles:
                from backend_app.security.bundles.security.domain.exceptions import AuthorizationError
                raise AuthorizationError(f"Requires role: {role}")
            return await func(*args, principal=principal, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, principal=principal, **kwargs)
        return wrapper
    return decorator


import asyncio
