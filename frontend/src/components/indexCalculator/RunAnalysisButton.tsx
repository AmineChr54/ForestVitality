// Run Analysis Button Component - Button with loading state
import './RunAnalysisButton.css';

interface RunAnalysisButtonProps {
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  progress?: number;
}

export const RunAnalysisButton = ({
  onClick,
  isLoading = false,
  disabled = false,
  progress,
}: RunAnalysisButtonProps) => {
  return (
    <div className="run-analysis-container">
      <button
        className={`run-analysis-btn ${isLoading ? 'run-analysis-btn--loading' : ''}`}
        onClick={onClick}
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <>
            <span className="btn-spinner"></span>
            <span>Analysiere...</span>
          </>
        ) : (
          <>
            <span className="btn-icon">🔬</span>
            <span>Analyse starten</span>
          </>
        )}
      </button>

      {isLoading && progress !== undefined && (
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="progress-text">{progress}%</span>
        </div>
      )}
    </div>
  );
};
