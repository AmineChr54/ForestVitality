// AI Chat Panel Component - Chat message display
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatChatMessage } from '../../utils/chatUtils';
import './AiChatPanel.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface AiChatPanelProps {
  messages: Message[];
  isLoading?: boolean;
}

export const AiChatPanel = ({ messages, isLoading }: AiChatPanelProps) => {
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="chat-panel">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message ${message.role === 'user' ? 'message--user' : 'message--assistant'}`}
        >
          <div className="message-avatar">
            {message.role === 'user' ? '👤' : '🤖'}
          </div>
          <div className="message-content">
            <div className="message-header">
              <span className="message-role">
                {message.role === 'user' ? 'Du' : 'KI Assistent'}
              </span>
              <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
            <div className="message-text">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {formatChatMessage(message.content)}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="message message--assistant">
          <div className="message-avatar">🤖</div>
          <div className="message-content">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
