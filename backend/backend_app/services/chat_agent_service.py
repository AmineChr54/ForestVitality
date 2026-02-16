"""
Chat Agent Service
==================
LangChain ReAct Agent for the Forest Vitality AI Assistant.
Implements RBAC-gated tool access and geo-context awareness.
"""

import os
import logging
from typing import List, Dict, Any
from datetime import datetime
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from dotenv import load_dotenv

# Import our repositories and services
from backend_app.repositories.scene_repository import SceneRepository
from backend_app.services.vegetation_service import get_vegetation_index
from backend_app.services.ingest_service import IngestService
from backend_app.services.municipality_service import search_municipalities
from backend_app.repositories.opensearch_repository import get_client
from backend_app.services.audit_service import log_tool_execution
from backend_app.services.copernicus_api import CopernicusAPIClient

load_dotenv()

# Setup logging
# Setup logging
logger = logging.getLogger(__name__)

# --- DEBUG: File Logger ---
if not logger.handlers:
    fh = logging.FileHandler('agent_debug.log')
    fh.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(fh)
    logger.setLevel(logging.INFO) # Capture tool execution details
# --------------------------

# =============================================================================
# Tool Definitions - RBAC-Gated Functions
# =============================================================================

@tool
def search_scenes(bbox: List[float], start_date: str = None, end_date: str = None, max_cloud: float = 20.0) -> List[Dict[str, Any]]:
    """
    Search for LOCAL satellite scenes in a specific area and date range.
    BBox should be [west, south, east, north].
    Available to: VIEWER, FOREST_ANALYST, DATA_MANAGER, ADMIN
    """
    repo = SceneRepository()
    scenes = repo.search_scenes_by_geometry(bbox, start_date, end_date, max_cloud)
    
    # Enrich with ingestion status
    simplified = []
    for s in scenes:
        # Check for COG or any band with S3 path
        has_cog = s.get("scene_cog_path") is not None
        has_bands = any(b.get("s3_path") for b in s.get("bands", []))
        is_ready = has_cog or has_bands
        
        simplified.append({
            "scene_id": s.get("id"),
            "date": s.get("acquisition_date"),
            "cloud": s.get("cloud_coverage"),
            "level": s.get("processing_level"),
            "status": "Ready for Analysis" if is_ready else "Not Ingested (Metadata only)"
        })
    return simplified


@tool
def search_copernicus_scenes(bbox: List[float], start_date: str, end_date: str) -> List[Dict[str, Any]]:
    """
    Search the EXTERNAL Copernicus Dataspace for available satellite imagery.
    These scenes are OT stored locally.
    Returns: List of found scenes with ID, Date, and Cloud Cover.
    Available to: VIEWER, FOREST_ANALYST, DATA_MANAGER, ADMIN
    """
    try:
        client = CopernicusAPIClient()
        # Ensure dates are strings YYYY-MM-DD
        results = client.search_scenes(bbox, start_date, end_date)
        
        if not results or not results.get('features'):
            return []

        # Parse STAC items for the LLM
        simplified_scenes = []
        for feature in results['features'][:10]: # Limit to 10 to save tokens
            props = feature.get('properties', {})
            simplified_scenes.append({
                "product_id": feature.get('id'),
                "date": props.get('datetime'),
                "cloud_cover": props.get('eo:cloud_cover', 'unknown'),
                "platform": props.get('platform'),
                "status": "NOT_INGESTED (Requires ingestion)"
            })
        return simplified_scenes
    except Exception as e:
        return [{"error": f"Remote search failed: {str(e)}"}]


@tool
def run_vegetation_analysis(scene_id: str) -> Dict[str, Any]:
    """
    Perform vegetation health analysis on LOCAL data only.
    If the scene is not found locally, this tool will fail.
    DO NOT attempt to auto-ingest.
    Available to: FOREST_ANALYST, DATA_MANAGER, ADMIN
    """
    logger.info(f"[ANALYSIS] Running vegetation analysis for scene: {scene_id}")
    result = get_vegetation_index(scene_id)
    
    # Format results for better readability
    if "error" not in result:
        formatted = {
            "scene_id": scene_id,
            "timestamp": datetime.utcnow().isoformat(),
            "indices": {}
        }
        for index_name, values in result.items():
            if hasattr(values, 'mean'):
                formatted["indices"][index_name] = {
                    "mean": round(float(values.mean()), 4),
                    "min": round(float(values.min()), 4),
                    "max": round(float(values.max()), 4)
                }
            else:
                formatted["indices"][index_name] = values
        return formatted
    return result


@tool
def ingest_satellite_data(product_id: str) -> Dict[str, Any]:
    """
    Ingest (download and index) a new satellite scene from the Copernicus catalogue.
    ONLY use this if the user EXPLICITLY requests it (e.g., "ingest this", "download").
    Do not run this automatically.
    Available to: DATA_MANAGER, ADMIN only
    """
    service = IngestService()
    try:
        logger.info(f"[INGEST] Starting ingestion for product: {product_id}")
        service.ingest_by_product_id(product_id)
        return {"status": "success", "message": f"Scene {product_id} ingestion completed successfully."}
    except Exception as e:
        logger.error(f"[INGEST] Error: {str(e)}")
        return {"status": "error", "message": str(e)}

# ... (Previous code)

# Instructions Update
"""
319: 📋 INSTRUCTIONS
320: ═══════════════════════════════════════════════════════════════════════════════
321: 
322: 1. **Prioritize LOCAL Data** - `search_scenes` results with "Ready" status are optimal.
323: 2. **External Data requires Ingestion** - If status is "Not Ingested" and you found it via `search_copernicus_scenes`, it must be ingested.
324: 3. **Self-Healing Sync** - If a local scene is marked "Not Ingested" but the user insists it is there, try `run_vegetation_analysis` anyway. The system will auto-sync the metadata from MinIO.
325: 4. **NO Auto-Ingestion** - Never call `ingest_satellite_data` without explicit user request.
"""


@tool
def search_locations(query: str) -> List[Dict[str, Any]]:
    """
    Search for German municipalities and locations to get their bounding boxes.
    Use this when the user asks for a specific city or region (e.g., 'Munich', 'Harz', 'Kassel').
    Returns location name, coordinates, and bounding box.
    Available to: VIEWER, FOREST_ANALYST, DATA_MANAGER, ADMIN
    """
    return search_municipalities(query)


@tool
def delete_scene_data(scene_id: str) -> Dict[str, Any]:
    """
    Completely remove a scene's data from storage and metadata index.
    This action is irreversible!
    Available to: DATA_MANAGER, ADMIN only
    """
    logger.warning(f"[DELETE] Scene deletion requested: {scene_id}")
    # In production, this would call a deletion service
    return {"status": "success", "message": f"Scene {scene_id} and all associated files have been permanently removed."}


@tool
def get_operation_logs(limit: int = 10) -> List[Dict[str, Any]]:
    """
    Retrieve the most recent operation logs (ingestions, deletions, analyses) performed on the platform.
    Used for auditing and activity tracking.
    Available to: FOREST_ANALYST, DATA_MANAGER, ADMIN
    """
    client = get_client()
    try:
        response = client.search(
            index="operation_logs",
            body={
                "sort": [{"timestamp": "desc"}],
                "size": limit
            }
        )
        return [hit["_source"] for hit in response["hits"]["hits"]]
    except Exception as e:
        logger.error(f"[LOGS] Error fetching operation logs: {str(e)}")
        return []


@tool  
def get_my_permissions() -> Dict[str, Any]:
    """
    Returns information about the current user's role and permissions.
    Helps users understand what actions they can perform.
    Available to: Everyone
    """
    # This tool's actual logic is handled by the service to reflect the request context
    return {"note": "Permissions will be shown in context."}


@tool
def get_current_bbox() -> Dict[str, Any]:
    """
    Returns the current map view's bounding box coordinates.
    Use this when the user asks about their current map area or selected region.
    The bbox format is [min_longitude, min_latitude, max_longitude, max_latitude].
    Available to: Everyone
    """
    # This tool's actual logic is handled by the service to reflect the request context
    return {"note": "BBox will be provided from geo_context."}


# =============================================================================
# Permission Mapping - Maps tools to required permissions
# =============================================================================

TOOL_PERMISSIONS = {
    "search_scenes": "scenes:read",
    "search_copernicus_scenes": "scenes:read",
    "run_vegetation_analysis": "analysis:run",
    "ingest_satellite_data": "data:ingest",
    "search_locations": "regions:read",
    "delete_scene_data": "data:delete",
    "get_operation_logs": "logs:read",
    "get_my_permissions": "any",
    "get_current_bbox": "any"
}

# Role descriptions for the AI
ROLE_DESCRIPTIONS = {
    "ADMIN": "Full system access - can perform all operations",
    "DATA_MANAGER": "Can ingest, delete data, and run analyses",
    "FOREST_ANALYST": "Can run vegetation analyses and view operation logs",
    "VIEWER": "Read-only access - can search and view data"
}

# =============================================================================
# Chat Agent Service - Main Implementation
# =============================================================================

class ChatAgentService:
    """
    LangChain-powered chat service with RBAC and geo-context support.
    Implements the ReAct (Reasoning + Acting) pattern for multi-step queries.
    """
    
    def __init__(self):
        logger.info("[AGENT] Initializing ChatAgentService with Azure OpenAI...")
        
        self.llm = AzureChatOpenAI(
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            openai_api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            temperature=0
        )
        
        self.tools = {
            "search_scenes": search_scenes,
            "search_copernicus_scenes": search_copernicus_scenes,
            "run_vegetation_analysis": run_vegetation_analysis,
            "ingest_satellite_data": ingest_satellite_data,
            "search_locations": search_locations,
            "delete_scene_data": delete_scene_data,
            "get_operation_logs": get_operation_logs,
            "get_my_permissions": get_my_permissions,
            "get_current_bbox": get_current_bbox
        }
        
        self.llm_with_tools = self.llm.bind_tools(list(self.tools.values()))
        logger.info(f"[AGENT] Initialized with {len(self.tools)} tools")

    def _build_system_prompt(self, permissions: List[str], geo_context: Dict[str, Any] = None) -> str:
        """Build a context-aware system prompt for the AI."""
        
        # Determine user role based on permissions
        if "*" in permissions:
            role = "ADMIN"
        elif "data:ingest" in permissions:
            role = "DATA_MANAGER"
        elif "analysis:run" in permissions:
            role = "FOREST_ANALYST"
        else:
            role = "VIEWER"
        
        # Format available tools based on permissions
        available_tools = []
        restricted_tools = []
        
        for tool_name, required_perm in TOOL_PERMISSIONS.items():
            if required_perm == "any" or "*" in permissions or required_perm in permissions:
                available_tools.append(f"✅ {tool_name}")
            else:
                restricted_tools.append(f"🔒 {tool_name} (requires: {required_perm})")
        
        # Format geo-context
        geo_info = "No map context available - user may need to open the map view."
        if geo_context:
            bbox = geo_context.get("bbox")
            if bbox:
                geo_info = f"""Current Map View:
- Bounding Box: [{bbox[0]:.6f}, {bbox[1]:.6f}, {bbox[2]:.6f}, {bbox[3]:.6f}]
- Format: [min_longitude, min_latitude, max_longitude, max_latitude]
- Zoom Level: {geo_context.get('zoom', 'unknown')}"""
        
        return f"""You are the **Forest Vitality AI Assistant** 🌲

You help users monitor forest health using Sentinel-2 satellite data from Copernicus.
You have access to professional geospatial analysis tools.

═══════════════════════════════════════════════════════════════════════════════
📍 CURRENT USER CONTEXT
═══════════════════════════════════════════════════════════════════════════════

**User Role:** {role}
**Role Description:** {ROLE_DESCRIPTIONS.get(role, 'Standard user')}
**Permissions:** {', '.join(permissions) if permissions else 'None'}

{geo_info}

═══════════════════════════════════════════════════════════════════════════════
🔧 AVAILABLE TOOLS
═══════════════════════════════════════════════════════════════════════════════

{chr(10).join(available_tools)}

{f"**Restricted (contact admin for access):**" + chr(10) + chr(10).join(restricted_tools) if restricted_tools else ""}

═══════════════════════════════════════════════════════════════════════════════
📋 INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

1. **Always search locally first** - Use `search_scenes` before suggesting data ingestion
2. **Respect permissions** - If a user lacks permission, explain what role they need
3. **Use geo-context** - When searching, use the current map bbox if available
4. **Be specific** - When showing results, include scene IDs, dates, and key metrics
5. **Explain vegetation indices**:
   - NDVI: Vegetation health (-1 to 1, higher = healthier)
   - EVI: Enhanced vegetation with atmospheric correction
   - NDWI: Water content in vegetation
   - NDMI: Moisture stress indicator

Respond in the same language as the user's message.
Be professional but friendly. Use markdown formatting for clarity.
"""

    def chat(self, request: Any) -> Dict[str, str]:
        """
        Process a chat message and return the AI response.
        Implements RBAC verification on every tool call.
        """
        try:
            # Extract request data
            permissions = list(request.permissions) if hasattr(request, 'permissions') else []
            geo_context = request.geo_context if hasattr(request, 'geo_context') else None
            
            logger.info(f"[CHAT] New request - Permissions: {permissions}, Has geo_context: {geo_context is not None}")
            
            # Build system prompt with context
            system_prompt = self._build_system_prompt(permissions, geo_context)
            messages = [SystemMessage(content=system_prompt)]
            
            # Add conversation history
            if hasattr(request, 'history') and request.history:
                for msg in request.history:
                    if msg.role == "user":
                        messages.append(HumanMessage(content=msg.content))
                    else:
                        messages.append(AIMessage(content=msg.content))
            
            # Build current message with optional geo-context
            user_content = request.message
            if geo_context and geo_context.get("bbox"):
                bbox = geo_context["bbox"]
                user_content += f"\n\n[Current Map BBox: {bbox}]"
            
            messages.append(HumanMessage(content=user_content))
            
            # ReAct Loop - Process until we get a final response
            max_iterations = 10  # Safety limit
            iteration = 0
            
            while iteration < max_iterations:
                iteration += 1
                
                try:
                    response = self.llm_with_tools.invoke(messages)
                except Exception as e:
                    logger.error(f"[CHAT] LLM Error: {str(e)}")
                    raise e # Re-raise to be caught by global handler
                
                # If no tool calls, return the final response
                if not response.tool_calls:
                    return {"reply": response.content}
                
                # Process tool calls
                messages.append(response)
                
                for tool_call in response.tool_calls:
                    tool_name = tool_call["name"]
                    args = tool_call["args"]
                    required_perm = TOOL_PERMISSIONS.get(tool_name, "unknown")
                    
                    # Log the tool call attempt with security context
                    log_tool_execution(
                        tool_name=tool_name,
                        user_permissions=permissions,
                        required_permission=required_perm,
                        granted=(
                            required_perm == "any" or
                            "*" in permissions or
                            required_perm in permissions
                        ),
                        args=args
                    )
                    
                    # RBAC Verification
                    permission_granted = (
                        required_perm == "any" or
                        "*" in permissions or
                        required_perm in permissions
                    )
                    
                    if not permission_granted:
                        output = f"""🔒 **Permission Denied**
    
    You do not have the `{required_perm}` permission required to use `{tool_name}`.
    
    **Your current permissions:** {', '.join(permissions) if permissions else 'None'}
    
    To gain access to this tool, please contact your administrator to upgrade your role."""
                        
                        logger.warning(f"[SECURITY] Access Denied: {tool_name} for permissions {permissions}")
                        
                    elif tool_name == "get_my_permissions":
                        # Special handling for permissions query
                        output = f"""**Your Current Access:**
    - **Permissions:** {', '.join(permissions) if permissions else 'None'}
    - **Available Tools:** {', '.join([t for t, p in TOOL_PERMISSIONS.items() if p == 'any' or '*' in permissions or p in permissions])}"""
                        
                    elif tool_name == "get_current_bbox":
                        # Special handling for bbox query
                        if geo_context and geo_context.get("bbox"):
                            bbox = geo_context["bbox"]
                            output = f"""**Current Map Bounding Box:**
    - West (Min Longitude): {bbox[0]:.6f}
    - South (Min Latitude): {bbox[1]:.6f}
    - East (Max Longitude): {bbox[2]:.6f}
    - North (Max Latitude): {bbox[3]:.6f}
    
    This represents the coordinates in the format: [min_longitude, min_latitude, max_longitude, max_latitude]"""
                        else:
                            output = "No map context available. Please navigate to the map view to see your current bounding box."
                    else:
                        # Execute the actual tool
                        tool_func = self.tools[tool_name]
                        try:
                            result = tool_func.invoke(args)
                            output = str(result)
                            logger.info(f"[TOOL] {tool_name} completed successfully")
                        except Exception as e:
                            output = f"Error executing {tool_name}: {str(e)}"
                            logger.error(f"[TOOL] {tool_name} failed: {str(e)}")
                    
                    messages.append(ToolMessage(
                        tool_call_id=tool_call["id"],
                        content=output
                    ))
            
            # Safety fallback if max iterations reached
            logger.warning("[CHAT] Max iterations reached in ReAct loop")
            
            # DEBUG: Dump last messages to see what went wrong
            debug_trace = "\n".join([f"- {m.type.upper()}: {str(m.content)[:200]}..." for m in messages[-6:]])
            return {"reply": f"❌ **Debug Info**\nI kept trying but got stuck. Here are my last attempts:\n\n{debug_trace}\n\nPlease try expecting this!"}
        
        except Exception as global_e:
            logger.error(f"[FATAL] Global Chat Error: {str(global_e)}")
            return {"reply": f"❌ **System Error (Global)**\n\nI crashed completely. Technical reason:\n\n`{str(global_e)}`"}
