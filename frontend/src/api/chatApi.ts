/**
 * Chat API Client
 * ================
 * Connects the frontend to the AI Chat backend.
 * Matches the backend's ChatRequest model in chat_controller.py
 */
import { httpClient } from './httpClient';

// ---------------------------------------------------------------------------
// Types (matching backend/backend_app/controllers/chat_controller.py)
// ---------------------------------------------------------------------------

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface GeoContext {
    bbox?: [number, number, number, number]; // [west, south, east, north]
    center?: [number, number]; // [lng, lat]
    zoom?: number;
}

export interface ChatRequest {
    message: string;
    history: ChatMessage[];
    geo_context?: GeoContext | null;
    permissions?: string[]; // Set by backend from JWT
}

export interface ChatResponse {
    reply: string;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Send a message to the Forest AI Assistant
 */
export async function sendChatMessage(
    message: string,
    history: ChatMessage[] = [],
    geoContext?: GeoContext | null
): Promise<ChatResponse> {
    const request: ChatRequest = {
        message,
        history,
        geo_context: geoContext || null
    };

    const response = await httpClient.post<ChatResponse>('/chat', request);
    return response.data;
}
