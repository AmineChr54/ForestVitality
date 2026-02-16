/**
 * Chat Widget Component
 * A floating chat interface for the Forest AI Assistant
 * Connected to real backend AI Agent with Map Geo-Context
 */
import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { sendChatMessage, type ChatMessage, type GeoContext } from '../../api/chatApi';
import { useMapStore } from '../../state/mapStore';
import { useAuth } from '../../hooks';
import { getPrimaryRole } from '../../utils/roleUtils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatChatMessage } from '../../utils/chatUtils';
import './ChatWidget.css';

interface DisplayMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get map bounds for geo-context
    const mapBounds = useMapStore((state) => state.bounds);
    const selectedRegionName = useMapStore((state) => state.selectedRegionName);

    // Get user info for display
    const { user } = useAuth();
    const userRole = getPrimaryRole(user);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: DisplayMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Build history for context (convert to ChatMessage format)
            const history: ChatMessage[] = messages.map(m => ({
                role: m.role,
                content: m.content
            }));

            // Build geo-context from current map state
            const geoContext: GeoContext | null = mapBounds ? {
                bbox: mapBounds.bbox,
                center: mapBounds.center,
                zoom: mapBounds.zoom
            } : null;

            // Log geo-context for debugging
            if (geoContext) {
                console.log('[ChatWidget] Sending with geo-context:', geoContext);
            }

            // Call the REAL backend API with geo-context
            const response = await sendChatMessage(userMessage.content, history, geoContext);

            const assistantMessage: DisplayMessage = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: response.reply,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('[ChatWidget] Error:', error);

            let errorText = 'Sorry, there was an error connecting to the AI service.';

            // Handle customized AppError from httpClient (which wraps axios error)
            const genericError = error as any;
            if (genericError.status && !axios.isAxiosError(error)) {
                if (genericError.status === 401) errorText = "Authentication failed (401). Please try logging out and back in.";
                else if (genericError.status === 403) errorText = "Permission denied (403). Access restrictions apply.";
                else if (genericError.status === 500) errorText = `Server error (500): ${genericError.message || 'Internal Server Error'}`;
                else errorText = `Error (${genericError.status}): ${genericError.message}`;
            }
            else if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const data = error.response?.data;
                const detail = typeof data === 'object' && data ? (data as any).detail : null;

                if (status === 401) errorText = "Authentication failed (401). Please try logging out and back in.";
                else if (status === 403) errorText = "Permission denied (403). You don't have access to this resource.";
                else if (status === 500) errorText = `Server error (500): ${detail || 'Internal Server Error'}`;
                else errorText = `Connection error (${status}): ${detail || error.message}`;
            } else if (error instanceof Error) {
                errorText = `Error: ${error.message}`;
            }

            const errorMessage: DisplayMessage = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: `${errorText} (Check backend logs)`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('de-DE', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format bbox for display
    const formatBbox = () => {
        if (!mapBounds) return 'No map context';
        const { bbox } = mapBounds;
        return `[${bbox[0].toFixed(2)}, ${bbox[1].toFixed(2)}, ${bbox[2].toFixed(2)}, ${bbox[3].toFixed(2)}]`;
    };

    return (
        <>
            {/* Floating Chat Button */}
            <button
                className={`chat-fab ${isOpen ? 'chat-fab--open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle AI Assistant"
            >
                {isOpen ? '✕' : '🤖'}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="chat-widget">
                    <div className="chat-widget__header">
                        <div className="chat-widget__title">
                            <span className="chat-widget__icon">🌲</span>
                            <div>
                                <h3>Forest AI Assistant</h3>
                                <span className="chat-widget__status">● Online</span>
                            </div>
                        </div>
                        {/* User Role Badge */}
                        {userRole && (
                            <span className="chat-widget__role-badge">{userRole}</span>
                        )}
                    </div>

                    {/* Geo-Context Indicator */}
                    {mapBounds && (
                        <div className="chat-widget__geo-context">
                            <span className="geo-icon">📍</span>
                            <span className="geo-text">
                                {selectedRegionName || `BBox: ${formatBbox()}`}
                            </span>
                        </div>
                    )}

                    <div className="chat-widget__messages">
                        {messages.length === 0 && (
                            <div className="chat-widget__welcome">
                                <p>👋 Hallo! Ich bin dein Forest Vitality AI Assistant.</p>
                                <p>Frag mich über Waldgesundheit, Satellitenbilder oder Vegetationsanalysen.</p>
                                {mapBounds && (
                                    <p className="chat-widget__welcome-context">
                                        🗺️ Ich sehe deine aktuelle Kartenansicht und kann Daten für diese Region analysieren.
                                    </p>
                                )}
                            </div>
                        )}
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`chat-widget__message chat-widget__message--${msg.role}`}
                            >
                                <div className="chat-widget__message-content">
                                    <span className="chat-widget__message-time">
                                        {formatTime(msg.timestamp)}
                                    </span>
                                    <div className="markdown-content">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {formatChatMessage(msg.content)}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="chat-widget__message chat-widget__message--assistant">
                                <div className="chat-widget__typing">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form
                        className="chat-widget__input-area"
                        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Stell deine Frage..."
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={!input.trim() || isLoading}>
                            ➤
                        </button>
                    </form>
                </div>
            )}
        </>
    );
};

export default ChatWidget;
