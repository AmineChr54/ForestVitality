// Region Select Page Component
import { useState } from 'react';
import { useRegions } from '../hooks';
import { useAuth } from '../hooks';
import { canIngestData, isAdmin } from '../utils/roleUtils';
import { MapView } from '../components/map/MapView';
import { DrawTools } from '../components/map/DrawTools';
import { RegionOverlayCard } from '../components/map/RegionOverlayCard';
import type { GeoJSONPolygon } from '../types/geometry';
import './RegionSelectPage.css';

const RegionSelectPage = () => {
    const { regions, isLoading, selectedRegion, selectRegion, createRegion, deleteRegion } = useRegions();
    const { user } = useAuth();
    const [isDrawing, setIsDrawing] = useState(false);
    const [newRegionName, setNewRegionName] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [drawnGeometry, setDrawnGeometry] = useState<GeoJSONPolygon | null>(null);

    // Check if user can manage regions (create/delete)
    const canManageRegions = canIngestData(user) || isAdmin(user);

    const handleStartDrawing = () => {
        setIsDrawing(true);
    };

    const handleDrawComplete = (geometry: GeoJSONPolygon) => {
        setDrawnGeometry(geometry);
        setIsDrawing(false);
        setShowCreateModal(true);
    };

    const handleCreateRegion = async () => {
        if (!drawnGeometry || !newRegionName.trim()) return;

        await createRegion({
            name: newRegionName,
            geometry: drawnGeometry,
        });

        setShowCreateModal(false);
        setNewRegionName('');
        setDrawnGeometry(null);
    };

    const handleDeleteRegion = async (regionId: string) => {
        if (confirm('Region wirklich löschen?')) {
            await deleteRegion(regionId);
        }
    };

    return (
        <div className="region-page">
            <div className="region-sidebar">
                <div className="sidebar-header-section">
                    <h2 className="section-title">Meine Regionen</h2>
                    {canManageRegions && (
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleStartDrawing}
                            disabled={isDrawing}
                        >
                            ➕ Neue Region
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="region-list-loading">
                        <div className="skeleton" style={{ height: 60, marginBottom: 8 }}></div>
                        <div className="skeleton" style={{ height: 60, marginBottom: 8 }}></div>
                        <div className="skeleton" style={{ height: 60 }}></div>
                    </div>
                ) : (
                    <div className="region-list">
                        {regions.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">🗺️</span>
                                <p>Noch keine Regionen</p>
                                <p className="text-sm text-muted">Zeichne eine Region auf der Karte</p>
                            </div>
                        ) : (
                            regions.map((region) => (
                                <div
                                    key={region.id}
                                    className={`region-item ${selectedRegion?.id === region.id ? 'region-item--selected' : ''}`}
                                    onClick={() => selectRegion(region.id)}
                                >
                                    <div className="region-item-content">
                                        <h4 className="region-name">{region.name}</h4>
                                        <p className="region-meta">
                                            {region.areaHectares?.toLocaleString()} ha
                                        </p>
                                    </div>
                                    {canManageRegions && (
                                        <button
                                            className="btn btn-icon btn-danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteRegion(region.id);
                                            }}
                                            title="Löschen"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <div className="region-map-container">
                <MapView
                    regions={regions}
                    selectedRegionId={selectedRegion?.id}
                    onRegionClick={selectRegion}
                />

                {isDrawing && (
                    <DrawTools
                        onDrawComplete={handleDrawComplete}
                        onCancel={() => setIsDrawing(false)}
                    />
                )}

                {selectedRegion && (
                    <RegionOverlayCard
                        region={selectedRegion}
                        onClose={() => selectRegion(null)}
                        onAnalyze={() => {
                            // Navigate to analysis with region selected (passing ID)
                            if (selectedRegion) {
                                window.location.href = `/dashboard/analysis?customRegionId=${selectedRegion.id}`;
                            }
                        }}
                    />
                )}

                {isDrawing && (
                    <div className="drawing-hint">
                        <span className="hint-icon">✏️</span>
                        Klicke auf die Karte, um eine Region zu zeichnen
                    </div>
                )}
            </div>

            {/* Create Region Modal */}
            {showCreateModal && (
                <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Neue Region erstellen</h3>
                        <div className="form-group">
                            <label className="form-label">Name der Region</label>
                            <input
                                type="text"
                                value={newRegionName}
                                onChange={(e) => setNewRegionName(e.target.value)}
                                placeholder="z.B. Schwarzwald Nord"
                                autoFocus
                            />
                        </div>
                        <div className="modal-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Abbrechen
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreateRegion}
                                disabled={!newRegionName.trim()}
                            >
                                Erstellen
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegionSelectPage;
