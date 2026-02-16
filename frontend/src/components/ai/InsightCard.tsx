// Insight Card Component - Display AI insight
import type { AiInsight } from '../../hooks';
import './InsightCard.css';

interface InsightCardProps {
  insight: AiInsight;
  compact?: boolean;
}

export const InsightCard = ({ insight, compact = false }: InsightCardProps) => {
  const confidenceLevel = insight.confidence >= 0.8
    ? 'high'
    : insight.confidence >= 0.6
      ? 'medium'
      : 'low';

  if (compact) {
    return (
      <div className="insight-card insight-card--compact">
        <div className="insight-question">{insight.question}</div>
        <div className="insight-meta">
          <span className={`confidence confidence--${confidenceLevel}`}>
            {Math.round(insight.confidence * 100)}%
          </span>
          <span className="insight-date">
            {new Date(insight.createdAt).toLocaleDateString('de-DE')}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="insight-card">
      <div className="insight-header">
        <span className={`confidence-badge confidence--${confidenceLevel}`}>
          {Math.round(insight.confidence * 100)}% Konfidenz
        </span>
      </div>

      <div className="insight-question">
        <span className="question-label">Frage:</span>
        {insight.question}
      </div>

      <div className="insight-answer">{insight.answer}</div>

      {insight.recommendations.length > 0 && (
        <div className="insight-recommendations">
          <span className="rec-label">Empfehlungen:</span>
          <ul className="rec-list">
            {insight.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {insight.sources.length > 0 && (
        <div className="insight-sources">
          <span className="sources-label">Quellen:</span>
          <div className="sources-list">
            {insight.sources.map((source, i) => (
              <span key={i} className="source-tag">{source}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
