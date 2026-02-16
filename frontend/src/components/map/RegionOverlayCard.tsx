// Region Overlay Card Component - Region info panel
import type { Region } from '../../types';
import './RegionOverlayCard.css';

interface RegionOverlayCardProps {
  region: Region;
  onClose: () => void;
  onAnalyze: () => void;
}

export const RegionOverlayCard = ({ region, onClose, onAnalyze }: RegionOverlayCardProps) => {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="region-overlay-card">
      <div className="overlay-header">
        <h3 className="overlay-title">{region.name}</h3>
        <button className="close-btn" onClick={onClose} title="Schließen">
          ✕
        </button>
      </div>

      {region.description && (
        <p className="overlay-description">{region.description}</p>
      )}

      <div className="overlay-stats">
        <div className="stat-item">
          <span className="stat-icon">📐</span>
          <div className="stat-content">
            <span className="stat-value">{region.areaHectares?.toLocaleString() || '-'}</span>
            <span className="stat-label">Hektar</span>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">📅</span>
          <div className="stat-content">
            <span className="stat-value">{formatDate(region.createdAt)}</span>
            <span className="stat-label">Erstellt</span>
          </div>
        </div>
      </div>

      <div className="overlay-actions">
        <button className="btn btn-primary w-full" onClick={onAnalyze}>
          📊 Analyse starten
        </button>
      </div>
    </div>
  );
};
