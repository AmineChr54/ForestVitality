// AI Insights Hook - Mock Implementation
// TODO: F2 should replace with React Query implementation

import { useState, useCallback } from 'react';

export interface AiInsight {
    id: string;
    question: string;
    answer: string;
    confidence: number;
    sources: string[];
    recommendations: string[];
    createdAt: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
}

interface UseAiInsightsReturn {
    insights: AiInsight[];
    messages: Message[];
    isLoading: boolean;
    error: string | null;
    askQuestion: (question: string, regionId?: string, analysisId?: string) => Promise<AiInsight>;
    clearHistory: () => void;
}

// Mock AI responses
const MOCK_RESPONSES: Record<string, Partial<AiInsight>> = {
    default: {
        answer: 'Basierend auf den Analysedaten zeigt die Region eine gesunde Vegetationsdecke mit vereinzelten Stresszonen im östlichen Bereich. Die NDVI-Werte liegen überwiegend im optimalen Bereich von 0.6-0.8.',
        confidence: 0.85,
        sources: ['Sentinel-2 Analyse vom 15.06.2024', 'Historische Vergleichsdaten'],
        recommendations: [
            'Regelmäßiges Monitoring der Stresszonen empfohlen',
            'Bewässerung im östlichen Sektor prüfen',
            'Nächste Analyse in 2 Wochen durchführen',
        ],
    },
    stress: {
        answer: 'Die Vegetationsstress-Analyse zeigt erhöhte Werte im nordwestlichen Quadranten. Mögliche Ursachen sind Wassermangel oder Schädlingsbefall. Der NDMI-Index deutet auf reduzierte Wasseraufnahme hin.',
        confidence: 0.78,
        sources: ['NDMI Analyse', 'NDVI Zeitreihe'],
        recommendations: [
            'Bodenproben entnehmen',
            'Detailuntersuchung vor Ort durchführen',
            'Bewässerungsintervalle anpassen',
        ],
    },
    health: {
        answer: 'Die Waldgesundheit in dieser Region ist insgesamt gut. Der EVI zeigt stabile Werte über die letzten 3 Monate. Keine Anzeichen von großflächigem Absterben oder Krankheitsbefall erkennbar.',
        confidence: 0.92,
        sources: ['EVI Langzeitanalyse', 'Vergleich mit Referenzgebieten'],
        recommendations: [
            'Aktuelles Management beibehalten',
            'Jährliche Kontrolle weiterführen',
        ],
    },
};

export const useAiInsights = (): UseAiInsightsReturn => {
    const [insights, setInsights] = useState<AiInsight[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const askQuestion = useCallback(
        async (question: string): Promise<AiInsight> => {
            setIsLoading(true);
            setError(null);

            // Add user message
            const userMessage: Message = {
                id: `msg-${Date.now()}`,
                role: 'user',
                content: question,
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, userMessage]);

            // Simulate API delay (typing effect)
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Choose mock response based on keywords
            let mockResponse = MOCK_RESPONSES.default;
            const lowerQuestion = question.toLowerCase();
            if (lowerQuestion.includes('stress') || lowerQuestion.includes('problem')) {
                mockResponse = MOCK_RESPONSES.stress;
            } else if (lowerQuestion.includes('gesund') || lowerQuestion.includes('health')) {
                mockResponse = MOCK_RESPONSES.health;
            }

            const insight: AiInsight = {
                id: `insight-${Date.now()}`,
                question,
                answer: mockResponse.answer!,
                confidence: mockResponse.confidence!,
                sources: mockResponse.sources!,
                recommendations: mockResponse.recommendations!,
                createdAt: new Date().toISOString(),
            };

            // Add assistant message
            const assistantMessage: Message = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content: insight.answer,
                timestamp: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setInsights((prev) => [insight, ...prev]);
            setIsLoading(false);

            return insight;
        },
        []
    );

    const clearHistory = useCallback(() => {
        setMessages([]);
        setInsights([]);
    }, []);

    return {
        insights,
        messages,
        isLoading,
        error,
        askQuestion,
        clearHistory,
    };
};
