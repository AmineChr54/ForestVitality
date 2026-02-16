// AI Insights Page Component
import { useState, useRef, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useAiInsights, useRegions, useAnalysis } from '../hooks';
import { useAuth } from '../hooks';
import { canAnalyze } from '../utils/roleUtils';
import { AiChatPanel } from '../components/ai/AiChatPanel';
import { InsightCard } from '../components/ai/InsightCard';
import './AiInsightsPage.css';

const AiInsightsPage = () => {
    const { messages, insights, isLoading, askQuestion, clearHistory } = useAiInsights();
    const { regions, selectedRegion, selectRegion } = useRegions();
    const { results } = useAnalysis();
    const { user } = useAuth();

    const [question, setQuestion] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Check if user can use AI insights
    const userCanAnalyze = canAnalyze(user);

    const regionResults = selectedRegion
        ? results.filter((r) => r.regionId === selectedRegion.id)
        : [];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!question.trim() || isLoading) return;

        const q = question;
        setQuestion('');
        await askQuestion(q, selectedRegion?.id, regionResults[0]?.id);
    };

    const suggestedQuestions = [
        'Wie ist der Gesundheitszustand des Waldes?',
        'Gibt es Anzeichen für Wasserstress?',
        'Was bedeuten die NDVI-Werte?',
        'Welche Bereiche brauchen Aufmerksamkeit?',
    ];
    // If user cannot analyze, show message
    if (!userCanAnalyze) {
        return (
            <div className="insights-page">
                <div className="alert alert-info" style={{ margin: '2rem', maxWidth: '600px' }}>
                    <span>🔒</span>
                    <p>Sie haben keine Berechtigung, KI Insights zu verwenden. Kontaktieren Sie einen Administrator.</p>
                </div>
            </div>
        );
    }
    return (
        <div className="insights-page">
            <div className="insights-sidebar">
                <div className="sidebar-section">
                    <h3 className="section-title">Kontext</h3>

                    <div className="control-group">
                        <label className="control-label">Region (optional)</label>
                        <select
                            value={selectedRegion?.id || ''}
                            onChange={(e) => selectRegion(e.target.value || null)}
                        >
                            <option value="">Keine Region</option>
                            {regions.map((region) => (
                                <option key={region.id} value={region.id}>{region.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedRegion && regionResults.length > 0 && (
                        <div className="context-info">
                            <p className="text-sm text-muted">
                                {regionResults.length} Analyse(n) verfügbar
                            </p>
                        </div>
                    )}
                </div>

                <div className="sidebar-section">
                    <h3 className="section-title">Letzte Insights</h3>
                    <div className="insights-list">
                        {insights.length === 0 ? (
                            <p className="text-sm text-muted">Noch keine Insights</p>
                        ) : (
                            insights.slice(0, 5).map((insight) => (
                                <InsightCard key={insight.id} insight={insight} compact />
                            ))
                        )}
                    </div>
                </div>

                <button
                    className="btn btn-secondary w-full"
                    onClick={clearHistory}
                    disabled={messages.length === 0}
                >
                    Chat leeren
                </button>
            </div>

            <div className="chat-container">
                <div className="chat-messages">
                    {messages.length === 0 ? (
                        <div className="chat-welcome">
                            <div className="welcome-icon">🤖</div>
                            <h2>KI Waldanalyse-Assistent</h2>
                            <p className="text-muted">
                                Stelle Fragen zu deinen Waldanalysen und erhalte KI-gestützte Insights.
                            </p>

                            <div className="suggested-questions">
                                <p className="suggested-label">Vorschläge:</p>
                                <div className="suggestions-grid">
                                    {suggestedQuestions.map((q, i) => (
                                        <button
                                            key={i}
                                            className="suggestion-btn"
                                            onClick={() => setQuestion(q)}
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <AiChatPanel messages={messages} isLoading={isLoading} />
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                <form className="chat-input-form" onSubmit={handleSubmit}>
                    <div className="input-container">
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Stelle eine Frage zur Waldanalyse..."
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary send-btn"
                            disabled={!question.trim() || isLoading}
                        >
                            {isLoading ? (
                                <span className="btn-spinner small"></span>
                            ) : (
                                '➤'
                            )}
                        </button>
                    </div>
                    <p className="input-hint text-sm text-muted">
                        {selectedRegion
                            ? `Kontext: ${selectedRegion.name}`
                            : 'Wähle eine Region für spezifischere Antworten'
                        }
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AiInsightsPage;
