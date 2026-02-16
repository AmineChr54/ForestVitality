// Resolution Selector Component - Pill buttons for band resolution selection
import type { BandResolution, VegetationIndex } from '../../types/vitality';
import { INDEX_INFO } from '../../types/vitality';
import './ResolutionSelector.css';

interface ResolutionSelectorProps {
    selectedIndex: VegetationIndex;
    selectedResolution: BandResolution;
    onSelect: (resolution: BandResolution) => void;
}

const ALL_RESOLUTIONS: BandResolution[] = [10, 20];

const RESOLUTION_LABELS: Record<BandResolution, { label: string; detail: string }> = {
    10: { label: '10 m', detail: 'Höhere Auflösung' },
    20: { label: '20 m', detail: 'Standardauflösung' },
};

export const ResolutionSelector = ({
    selectedIndex,
    selectedResolution,
    onSelect,
}: ResolutionSelectorProps) => {
    const indexInfo = INDEX_INFO[selectedIndex];
    const available = indexInfo.availableResolutions;

    return (
        <div className="resolution-selector">
            <div className="resolution-pills">
                {ALL_RESOLUTIONS.map((res) => {
                    const isAvailable = available.includes(res);
                    const isSelected = res === selectedResolution;
                    const info = RESOLUTION_LABELS[res];

                    return (
                        <button
                            key={res}
                            className={`resolution-pill${isSelected ? ' resolution-pill--selected' : ''}${!isAvailable ? ' resolution-pill--disabled' : ''}`}
                            onClick={() => isAvailable && onSelect(res)}
                            disabled={!isAvailable}
                            title={
                                isAvailable
                                    ? info.detail
                                    : `Nicht verfügbar für ${indexInfo.name} (Band B11 nur bei 20m)`
                            }
                        >
                            <span className="resolution-value">{info.label}</span>
                            <span className="resolution-detail">{info.detail}</span>
                        </button>
                    );
                })}
            </div>

            {/* Bands used indicator */}
            <div className="resolution-bands">
                <span className="bands-label">Bänder:</span>
                <div className="bands-tags">
                    {indexInfo.bands.map((band) => (
                        <span key={band} className="band-tag">{band}</span>
                    ))}
                </div>
            </div>

            {selectedResolution === 10 && (
                <div className="resolution-hint">
                    <span className="hint-icon">⚡</span>
                    <span className="hint-text">
                        10m Auflösung liefert schärfere Bilder, benötigt aber mehr Rechenzeit.
                    </span>
                </div>
            )}
        </div>
    );
};
