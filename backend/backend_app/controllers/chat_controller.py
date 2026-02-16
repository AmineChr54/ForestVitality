"""
Chat Controller
===============
FastAPI endpoint for the AI Chat Agent.
Handles authentication, permission injection, and request validation.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from backend_app.services.chat_agent_service import ChatAgentService
from backend_app.security.http.security_dependencies import get_current_principal
from backend_app.security.bundles.security.domain.principal import Principal

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter()
# Lazy initialization - service is created on first use to avoid requiring
# Azure OpenAI credentials at import time
chat_service = None

def get_chat_service():
    global chat_service
    if chat_service is None:
        chat_service = ChatAgentService()
    return chat_service


# =============================================================================
# Request/Response Models
# =============================================================================

class ChatMessage(BaseModel):
    """A single message in the conversation history."""
    role: str = Field(..., description="Either 'user' or 'assistant'")
    content: str = Field(..., description="The message content")


class GeoContext(BaseModel):
    """Geographic context from the map view."""
    bbox: Optional[List[float]] = Field(
        None, 
        description="Bounding box [west, south, east, north] or [minLng, minLat, maxLng, maxLat]"
    )
    center: Optional[List[float]] = Field(
        None,
        description="Center coordinates [longitude, latitude]"
    )
    zoom: Optional[float] = Field(
        None,
        description="Current zoom level"
    )


class ChatRequest(BaseModel):
    """Incoming chat request from the frontend."""
    message: str = Field(..., description="The user's message")
    history: List[ChatMessage] = Field(
        default=[], 
        description="Previous messages in the conversation"
    )
    geo_context: Optional[GeoContext] = Field(
        None, 
        description="Current map view bounding box for geo-aware queries"
    )
    permissions: List[str] = Field(
        default=[], 
        description="User permissions (set by controller from JWT)"
    )


class ChatResponse(BaseModel):
    """Response from the AI agent."""
    reply: str = Field(..., description="The AI assistant's response")


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    principal: Principal = Depends(get_current_principal)
):
    """
    Send a message to the Forest AI Assistant.
    
    The AI has access to various tools based on the user's role:
    - VIEWER: search_scenes, search_locations
    - FOREST_ANALYST: Above + run_vegetation_analysis, get_operation_logs
    - DATA_MANAGER: Above + ingest_satellite_data, delete_scene_data
    - ADMIN: Full master access
    
    If geo_context is provided with a bounding box, the AI will use it
    to filter spatial queries to the current map view.
    """
    try:
        # Log incoming request (without sensitive data)
        logger.info(
            f"[CHAT] Request from user with {len(principal.permissions)} permissions, "
            f"geo_context: {'Yes' if request.geo_context else 'No'}, "
            f"history_length: {len(request.history)}"
        )
        
        # Inject permissions from the authenticated principal
        request.permissions = list(principal.permissions)
        
        # Convert GeoContext model to dict for the service
        if request.geo_context:
            request.geo_context = request.geo_context.model_dump()
        
        # Call the AI service
        response = get_chat_service().chat(request)
        
        logger.info(f"[CHAT] Response generated successfully")
        return response
        
    except Exception as e:
        logger.error(f"[CHAT] Error processing request: {str(e)}", exc_info=True)
        # Return a structured error message within the chat for better UX
        return ChatResponse(
            reply=f"⚠️ **Analysis Connection Error**\n\nI encountered a technical issue while processing your request:\n\n`{str(e)}`"
        )


@router.get("/chat/health")
async def chat_health():
    """Health check for the chat service."""
    return {
        "status": "ok",
        "service": "chat_agent",
        "tools_loaded": len(chat_service.tools) if chat_service and hasattr(chat_service, 'tools') else 0
    }
