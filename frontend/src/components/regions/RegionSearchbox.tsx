/**
 * RegionSearchbox Component - Hierarchical Version
 * =================================================
 * Hierarchical search/navigation for German regions.
 * User can either search directly OR drill down: Bundesland → Bezirk → Kreis
 */

import { useState, useRef, useEffect } from 'react';
import type { RegionItem } from '../../types/api';
import './RegionSearchbox.css';

interface RegionSearchboxProps {
    /** Current search query */
    query: string;
    /** Update search query */
    onQueryChange: (query: string) => void;
    /** Search results grouped by type */
    results: {
        bundeslaender: RegionItem[];
        bezirke: RegionItem[];
        kreise: RegionItem[];
    } | null;
    /** Currently selected region */
    selectedRegion: RegionItem | null;
    /** Callback when region is selected */
    onSelect: (region: RegionItem | null) => void;
    /** Loading state */
    isLoading?: boolean;
    /** Placeholder text */
    placeholder?: string;
}

type NavigationLevel = 'root' | 'bundesland' | 'bezirk';

const REGION_ICONS: Record<string, string> = {
    bundesland: '🗺️',
    bezirk: '📍',
    kreis: '🏛️',
};

export const RegionSearchbox = ({
    query,
    onQueryChange,
    results,
    selectedRegion,
    onSelect,
    isLoading = false,
    placeholder = 'Region suchen...',
}: RegionSearchboxProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    // Hierarchical navigation state
    const [navLevel, setNavLevel] = useState<NavigationLevel>('root');
    const [selectedBundesland, setSelectedBundesland] = useState<RegionItem | null>(null);
    const [selectedBezirk, setSelectedBezirk] = useState<RegionItem | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Get items to display based on current navigation level and search
    const getDisplayItems = (): RegionItem[] => {
        if (!results) return [];

        const searchQuery = query.toLowerCase().trim();

        // If user is typing, show search results across all levels
        if (searchQuery.length > 0) {
            const allItems: RegionItem[] = [
                ...results.bundeslaender,
                ...results.bezirke,
                ...results.kreise,
            ];
            return allItems;
        }

        // Otherwise show hierarchical navigation
        switch (navLevel) {
            case 'root':
                // Show all Bundesländer
                return results.bundeslaender;

            case 'bundesland':
                // Show Bezirke for selected Bundesland
                if (!selectedBundesland) return [];
                return results.bezirke.filter(
                    b => b.bundesland === selectedBundesland.name
                );

            case 'bezirk':
                // Show Kreise for selected Bezirk
                if (!selectedBezirk) return [];
                return results.kreise.filter(
                    k => k.bezirk === selectedBezirk.name &&
                        k.bundesland === selectedBundesland?.name
                );

            default:
                return [];
        }
    };

    const displayItems = getDisplayItems();

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = (item: RegionItem) => {
        // If searching, select directly
        if (query.trim().length > 0) {
            onSelect(item);
            setIsOpen(false);
            return;
        }

        // Hierarchical navigation
        if (item.type === 'bundesland') {
            // Check if it has children (Bezirke)
            const hasBezirke = results?.bezirke.some(b => b.bundesland === item.name);
            if (hasBezirke) {
                // Drill down
                setSelectedBundesland(item);
                setNavLevel('bundesland');
                setHighlightedIndex(-1);
            } else {
                // Select directly (no children)
                onSelect(item);
                setIsOpen(false);
            }
        } else if (item.type === 'bezirk') {
            // Check if it has children (Kreise)
            const hasKreise = results?.kreise.some(
                k => k.bezirk === item.name && k.bundesland === selectedBundesland?.name
            );
            if (hasKreise) {
                // Drill down
                setSelectedBezirk(item);
                setNavLevel('bezirk');
                setHighlightedIndex(-1);
            } else {
                // Select directly (no children)
                onSelect(item);
                setIsOpen(false);
            }
        } else {
            // Kreis - always select
            onSelect(item);
            setIsOpen(false);
        }
    };

    const handleBack = () => {
        if (navLevel === 'bezirk') {
            setSelectedBezirk(null);
            setNavLevel('bundesland');
        } else if (navLevel === 'bundesland') {
            setSelectedBundesland(null);
            setNavLevel('root');
        }
        setHighlightedIndex(-1);
    };

    const handleSelectCurrent = () => {
        // Select the current navigation level
        if (navLevel === 'bundesland' && selectedBundesland) {
            onSelect(selectedBundesland);
            setIsOpen(false);
        } else if (navLevel === 'bezirk' && selectedBezirk) {
            onSelect(selectedBezirk);
            setIsOpen(false);
        }
    };

    const handleClear = () => {
        onSelect(null);
        onQueryChange('');
        setNavLevel('root');
        setSelectedBundesland(null);
        setSelectedBezirk(null);
        inputRef.current?.focus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onQueryChange(e.target.value);
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleFocus = () => {
        setIsOpen(true);
    };

    // Get breadcrumb for current navigation
    const getBreadcrumb = () => {
        const parts: string[] = [];
        if (selectedBundesland) {
            parts.push(selectedBundesland.name);
        }
        if (selectedBezirk) {
            parts.push(selectedBezirk.name);
        }
        return parts;
    };

    const breadcrumb = getBreadcrumb();


    // Handle keyboard navigation
    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (!isOpen && event.key !== 'Escape') {
            if (event.key === 'ArrowDown' || event.key === 'Enter') {
                setIsOpen(true);
                event.preventDefault();
            }
            return;
        }

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < displayItems.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                event.preventDefault();
                setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : displayItems.length - 1
                );
                break;
            case 'Enter':
                event.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < displayItems.length) {
                    handleItemClick(displayItems[highlightedIndex]);
                }
                break;
            case 'Escape':
                event.preventDefault();
                setIsOpen(false);
                inputRef.current?.blur();
                break;
            case 'Backspace':
                // Navigate back if search is empty
                if (query === '' && navLevel !== 'root') {
                    handleBack();
                    event.preventDefault();
                }
                break;
        }
    };

    return (
        <div className="region-searchbox" ref={containerRef}>
            <div className="region-searchbox-input-wrapper">
                <span className="region-searchbox-icon">🔍</span>
                <input
                    ref={inputRef}
                    type="text"
                    className="region-searchbox-input"
                    value={selectedRegion ? selectedRegion.name : query}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    autoComplete="off"
                />
                {isLoading && (
                    <span className="region-searchbox-spinner">⏳</span>
                )}
                {(selectedRegion || query) && !isLoading && (
                    <button
                        type="button"
                        className="region-searchbox-clear"
                        onClick={handleClear}
                        aria-label="Auswahl löschen"
                    >
                        ✕
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="region-dropdown">
                    {/* Breadcrumb / Back navigation */}
                    {navLevel !== 'root' && query === '' && (
                        <div className="region-nav-header">
                            <button
                                className="region-nav-back"
                                onClick={handleBack}
                            >
                                ← Zurück
                            </button>
                            <div className="region-nav-breadcrumb">
                                {breadcrumb.map((part, i) => (
                                    <span key={i}>
                                        {i > 0 && ' › '}
                                        {part}
                                    </span>
                                ))}
                            </div>
                            <button
                                className="region-nav-select"
                                onClick={handleSelectCurrent}
                            >
                                Auswählen
                            </button>
                        </div>
                    )}

                    {/* Items list */}
                    {displayItems.length === 0 && !isLoading && (
                        <div className="region-dropdown-empty">
                            {query.length > 0
                                ? 'Keine Regionen gefunden'
                                : 'Keine Einträge verfügbar'
                            }
                        </div>
                    )}

                    {displayItems.length > 0 && (
                        <div className="region-items-list">
                            {displayItems.map((item, index) => {
                                const isHighlighted = index === highlightedIndex;
                                const showDrillDown = query === '' && (
                                    item.type === 'bundesland' ||
                                    (item.type === 'bezirk' && navLevel === 'bundesland')
                                );

                                return (
                                    <div
                                        key={`${item.type}-${item.name}-${item.bundesland || ''}-${index}`}
                                        className={`region-item ${isHighlighted ? 'highlighted' : ''}`}
                                        onClick={() => handleItemClick(item)}
                                        onMouseEnter={() => setHighlightedIndex(index)}
                                    >
                                        <span className="region-item-icon">
                                            {REGION_ICONS[item.type]}
                                        </span>
                                        <span className="region-item-name">{item.name}</span>

                                        {/* Show context when searching */}
                                        {query && item.bundesland && item.type !== 'bundesland' && (
                                            <span className="region-item-parent">
                                                {item.bundesland}
                                            </span>
                                        )}

                                        {/* Show count and drill-down indicator */}
                                        {item.count && (
                                            <span className="region-item-count">
                                                {item.count}
                                            </span>
                                        )}

                                        {showDrillDown && (
                                            <span className="region-item-arrow">→</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Selected region info */}
            {selectedRegion && (
                <div className="region-selected-info">
                    <span className="region-selected-type">
                        {REGION_ICONS[selectedRegion.type]}
                    </span>
                    <span className="region-selected-name">
                        {selectedRegion.name}
                    </span>
                    {selectedRegion.bundesland && selectedRegion.type !== 'bundesland' && (
                        <span className="region-selected-parent">
                            ({selectedRegion.bundesland})
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
