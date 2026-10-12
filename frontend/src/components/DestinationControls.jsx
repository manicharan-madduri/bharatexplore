import React from 'react';
import { LayoutGrid, GalleryHorizontalEnd } from 'lucide-react';
import '../styles/DestinationControls.css';

export default function DestinationControls({
  viewMode,
  setViewMode,
  limit,
  setLimit,
  totalCount = 0,
  showAllOption = false,
}) {
  const limits = [3, 5, 10, 15, 20];

  return (
    <div className="destination-controls" role="toolbar" aria-label="Destination view controls">
      
      {/* Top-N Selector */}
      <div className="limit-selector" role="group" aria-label="Set destination limit">
        {limits.map(num => (
          <button
            key={num}
            type="button"
            className={`control-btn ${limit === num ? 'active' : ''}`}
            onClick={() => setLimit(num)}
            aria-pressed={limit === num}
          >
            Top {num}
          </button>
        ))}
        {showAllOption && totalCount > 20 && (
          <button
            key="all"
            type="button"
            className={`control-btn ${limit === 'all' ? 'active' : ''}`}
            onClick={() => setLimit('all')}
            aria-pressed={limit === 'all'}
          >
            All ({totalCount})
          </button>
        )}
      </div>

      <div className="controls-divider" aria-hidden="true" />

      {/* Grid / Accordion Toggle */}
      <div className="view-toggle" role="group" aria-label="Select view mode">
        <button
          className={`control-btn icon-btn ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => setViewMode('grid')}
          aria-pressed={viewMode === 'grid'}
          title="Grid View"
          aria-label="Switch to Grid View"
        >
          <LayoutGrid size={16} />
        </button>
        <button
          className={`control-btn icon-btn ${viewMode === 'accordion' ? 'active' : ''}`}
          onClick={() => setViewMode('accordion')}
          aria-pressed={viewMode === 'accordion'}
          title="Accordion View"
          aria-label="Switch to Accordion View"
        >
          <GalleryHorizontalEnd size={16} />
        </button>
      </div>

    </div>
  );
}
