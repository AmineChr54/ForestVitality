import React, { useState } from 'react';
import { MAP_CONFIG } from '../../constants/map';
import './MapLayerSelector.css';

// Define the keys of BASE_LAYERS
type BaseLayerKey = keyof typeof MAP_CONFIG.BASE_LAYERS;

interface MapLayerSelectorProps {
    selectedLayer: BaseLayerKey;
    onSelectLayer: (layerKey: BaseLayerKey) => void;
}

export const MapLayerSelector: React.FC<MapLayerSelectorProps> = ({ selectedLayer, onSelectLayer }) => {
    const [isOpen, setIsOpen] = useState(false);

    const layers = Object.entries(MAP_CONFIG.BASE_LAYERS).map(([key, config]) => ({
        key: key as BaseLayerKey,
        ...config
    }));



    return (
        <div
            className="map-layer-selector"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <div className={`layer-trigger ${isOpen ? 'active' : ''}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                    <polyline points="2 17 12 22 22 17"></polyline>
                    <polyline points="2 12 12 17 22 12"></polyline>
                </svg>
            </div>

            {isOpen && (
                <div className="layer-options">
                    {layers.map((layer) => (
                        <div
                            key={layer.key}
                            className={`layer-option ${selectedLayer === layer.key ? 'selected' : ''}`}
                            onClick={() => {
                                onSelectLayer(layer.key);
                                setIsOpen(false);
                            }}
                        >
                            {/* Simplified "preview" using colors or icons could go here */}
                            <div className={`layer-preview preview-${layer.key.toLowerCase()}`}></div>
                            <span className="layer-name">{layer.name}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
