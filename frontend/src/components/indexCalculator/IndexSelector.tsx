// Index Selector Component - Visual grid for vegetation index selection
import { VegetationIndex, INDEX_INFO } from '../../types/vitality';
import './IndexSelector.css';

// Emojis for each index to make them more visually distinct
const INDEX_EMOJI: Record<VegetationIndex, string> = {
  [VegetationIndex.NDVI]: '🌿',
  [VegetationIndex.EVI]: '🌱',
  [VegetationIndex.NDWI]: '💧',
  [VegetationIndex.NDMI]: '🌫️',
};

interface IndexSelectorProps {
  selectedIndex: VegetationIndex;
  onSelect: (index: VegetationIndex) => void;
}

export const IndexSelector = ({ selectedIndex, onSelect }: IndexSelectorProps) => {
  const indices = Object.values(VegetationIndex);

  return (
    <div className="index-selector">
      <div className="index-options">
        {indices.map((index) => {
          const info = INDEX_INFO[index];
          const isSelected = index === selectedIndex;

          return (
            <button
              key={index}
              className={`index-option ${isSelected ? 'index-option--selected' : ''}`}
              onClick={() => onSelect(index)}
              title={info.description}
            >
              <span className="index-emoji">{INDEX_EMOJI[index]}</span>
              <span className="index-name">{info.name}</span>
              {isSelected && (
                <span className="index-check">✓</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="index-description">
        <span className="desc-icon">ℹ️</span>
        <span className="desc-text">{INDEX_INFO[selectedIndex].description}</span>
      </div>
    </div>
  );
};
