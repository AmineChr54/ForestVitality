// Index Legend Component - Color scale for vegetation indices
import type { VegetationIndex, IndexInfo } from '../../types/vitality';
import './IndexLegend.css';

interface IndexLegendProps {
  indexType: VegetationIndex;
  indexInfo: IndexInfo;
  opacity?: number;
  onOpacityChange?: (opacity: number) => void;
  averageValue?: number | null;
}

export const IndexLegend = ({ indexType, indexInfo, opacity = 0.9, onOpacityChange, averageValue }: IndexLegendProps) => {
  // Calculate marker position percentage
  const getMarkerPosition = () => {
    if (averageValue === undefined || averageValue === null) return null;
    const min = indexInfo.minValue;
    const max = indexInfo.maxValue;
    // Clamp between 0 and 100
    const percent = Math.max(0, Math.min(100, ((averageValue - min) / (max - min)) * 100));
    return percent;
  };

  const markerPos = getMarkerPosition();

  return (
    <div className="index-legend">
      <div className="legend-header">
        <div>
          <span className="legend-title">{indexType}</span>
          <span className="legend-subtitle">{indexInfo.description}</span>
        </div>
      </div>

      <div className="legend-scale">
        <div
          className="scale-gradient"
          style={{
            background: `linear-gradient(to right, ${indexInfo.colorScale.join(', ')})`
          }}
        />
        {/* Average Marker with Label */}
        {markerPos !== null && (
          <div
            className="average-marker"
            style={{ left: `${markerPos}%` }}
            title={`Durchschnitt: ${averageValue?.toFixed(2)}`}
          >
            <div className="marker-value-label">
              {averageValue?.toFixed(2)}
            </div>
          </div>
        )}
        <div className="scale-labels">
          <span>{indexInfo.minValue}</span>
          <span>{indexInfo.maxValue}</span>
        </div>
      </div>

      <div className="legend-categories">
        <div className="category">
          <span className="category-color" style={{ background: indexInfo.colorScale[0] }} />
          <span className="category-label">Niedrig / Stress</span>
        </div>
        <div className="category">
          <span className="category-color" style={{ background: indexInfo.colorScale[2] }} />
          <span className="category-label">Mittel</span>
        </div>
        <div className="category">
          <span className="category-color" style={{ background: indexInfo.colorScale[5] }} />
          <span className="category-label">Hoch / Gesund</span>
        </div>
      </div>

      {/* Opacity Slider */}
      {onOpacityChange && (
        <div className="legend-opacity">
          <div className="opacity-header">
            <span className="opacity-label">Transparenz</span>
            <span className="opacity-value">{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(opacity * 100)}
            onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
            className="opacity-slider"
          />
        </div>
      )}
    </div>
  );
};
