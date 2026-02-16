"""
Audit Service
=============
Centralized logging for critical system operations and RBAC checks.
Logs events to the 'audit' logger which can be configured to write to file or DB.
"""

import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional

# Configure dedicated audit logger
audit_logger = logging.getLogger("audit")
audit_logger.setLevel(logging.INFO)

# Create file handler if not already configured
if not audit_logger.handlers:
    # Basic console handler for dev
    console_handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - [AUDIT] - %(message)s')
    console_handler.setFormatter(formatter)
    audit_logger.addHandler(console_handler)

def log_security_event(
    event_type: str,
    user_id: str = "anonymous", 
    resource: str = "unknown",
    action: str = "access",
    status: str = "success",
    details: Optional[Dict[str, Any]] = None
):
    """
    Log a security-relevant event.
    
    Args:
        event_type: Category of event (e.g., 'LOGIN', 'TOOL_ACCESS', 'DATA_INGEST')
        user_id: ID or username of the actor
        resource: Target resource (e.g., 'Scene:123', 'Tool:search_scenes')
        action: What was attempted (e.g., 'read', 'execute', 'delete')
        status: Outcome ('success', 'denied', 'error')
        details: Additional context dictionary
    """
    event = {
        "timestamp": datetime.utcnow().isoformat(),
        "type": event_type,
        "actor": user_id,
        "resource": resource,
        "action": action,
        "status": status,
        "details": details or {}
    }
    
    # In production, this might write to OpenSearch or a database
    audit_logger.info(json.dumps(event))

def log_tool_execution(
    tool_name: str,
    user_permissions: list,
    required_permission: str,
    granted: bool,
    args: Optional[Dict] = None
):
    """Specific helper for logging AI agent tool usage."""
    log_security_event(
        event_type="TOOL_EXECUTION",
        user_id="user_via_agent",  # Ideally passed from context
        resource=f"Tool:{tool_name}",
        action="execute",
        status="success" if granted else "denied",
        details={
            "required_perm": required_permission,
            "user_perms": user_permissions,
            "args": args
        }
    )
