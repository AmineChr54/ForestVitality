"""
Audit logging for security-sensitive operations.

Tracks who did what and when for compliance and security monitoring.
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum


class AuditAction(Enum):
    """Types of auditable actions"""
    LOGIN = "login"
    LOGOUT = "logout"
    ACCESS_DENIED = "access_denied"
    DATA_INGEST = "data_ingest"
    ANALYSIS_RUN = "analysis_run"
    USER_CREATE = "user_create"
    USER_DELETE = "user_delete"
    USER_UPDATE = "user_update"
    ROLE_CHANGE = "role_change"
    DATA_EXPORT = "data_export"
    DATA_DELETE = "data_delete"


class AuditLogger:
    """
    Centralized audit logger for security events.
    
    In production, this should write to:
    - Dedicated audit log file
    - Database table for queryability
    - SIEM system for monitoring
    """
    
    def __init__(self):
        self.logger = logging.getLogger("audit")
        self.logger.setLevel(logging.INFO)
        
        # TODO: Add file handler for production
        # handler = logging.FileHandler("audit.log")
        # self.logger.addHandler(handler)
    
    def log(
        self,
        action: AuditAction,
        user_id: str,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        resource: Optional[str] = None,
    ):
        """
        Log an audit event.
        
        Args:
            action: Type of action performed
            user_id: ID of user performing action
            success: Whether action succeeded
            details: Additional context
            ip_address: User's IP address
            resource: Resource being accessed/modified
        """
        
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "action": action.value,
            "user_id": user_id,
            "success": success,
            "ip_address": ip_address,
            "resource": resource,
            "details": details or {},
        }
        
        # Log as JSON for easy parsing
        import json
        self.logger.info(json.dumps(event))
        
        # In production, also write to database
        # await audit_repository.save(event)
    
    def log_access_attempt(
        self,
        user_id: str,
        resource: str,
        permission: str,
        granted: bool,
        ip_address: Optional[str] = None
    ):
        """Log an access control decision"""
        self.log(
            action=AuditAction.ACCESS_DENIED if not granted else AuditAction.LOGIN,
            user_id=user_id,
            success=granted,
            resource=resource,
            ip_address=ip_address,
            details={
                "permission": permission,
                "granted": granted,
            }
        )
    
    def log_data_operation(
        self,
        action: AuditAction,
        user_id: str,
        resource_type: str,
        resource_id: str,
        details: Optional[Dict[str, Any]] = None
    ):
        """Log data modification operations"""
        self.log(
            action=action,
            user_id=user_id,
            resource=f"{resource_type}:{resource_id}",
            details=details
        )


# Global audit logger instance
audit_logger = AuditLogger()


def audit(action: AuditAction):
    """
    Decorator to automatically audit endpoint calls.
    
    Usage:
        @router.post("/ingest")
        @audit(AuditAction.DATA_INGEST)
        def ingest_data(principal = Depends(get_current_principal)):
            ...
    """
    def decorator(func):
        from functools import wraps
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract principal from kwargs
            principal = kwargs.get("principal")
            user_id = principal.user_id if principal else "anonymous"
            
            try:
                result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
                audit_logger.log(
                    action=action,
                    user_id=user_id,
                    success=True,
                )
                return result
            except Exception as e:
                audit_logger.log(
                    action=action,
                    user_id=user_id,
                    success=False,
                    details={"error": str(e)}
                )
                raise
        
        return wrapper
    return decorator


import asyncio
