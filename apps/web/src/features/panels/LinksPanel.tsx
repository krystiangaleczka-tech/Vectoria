import React, { useState } from 'react';
import type { DocumentModel, ImageObject } from '@vectoria/core';
import { VectoriaIcon } from '@vectoria/ui';

export interface LinksPanelProps {
  doc: DocumentModel;
  onSelectObject: (id: string) => void;
  onEmbedImage: (objectId: string) => void;
  onRelinkImage: (objectId: string, file: File) => void;
}

export const LinksPanel: React.FC<LinksPanelProps> = ({
  doc,
  onSelectObject,
  onEmbedImage,
  onRelinkImage,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Collect all image objects (both linked and embedded)
  const imageObjects = Object.values(doc.objects).filter(
    (obj): obj is ImageObject => obj.type === 'image',
  );

  const linkedImages = imageObjects.filter((img) => img.source.type === 'link');
  const embeddedImages = imageObjects.filter((img) => img.source.type === 'embed');

  const filteredImages = imageObjects.filter((img) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const name = img.name.toLowerCase();
    const url = img.source.type === 'link' ? img.source.url.toLowerCase() : 'embedded';
    return name.includes(q) || url.includes(q);
  });

  return (
    <div className="panel-container links-panel" data-testid="links-panel">
      <div className="panel-header">
        <div className="panel-title-row">
          <VectoriaIcon name="link" size={16} />
          <span className="panel-title">Zewnętrzne zasoby i linki</span>
        </div>
        <div className="panel-badge">{linkedImages.length} linkowanych / {embeddedImages.length} osadzonych</div>
      </div>

      <div className="panel-search-box">
        <VectoriaIcon name="search" size={14} className="search-icon" />
        <input
          type="text"
          placeholder="Filter assets..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="panel-content links-list">
        {filteredImages.length === 0 ? (
          <div className="empty-state-message">
            <VectoriaIcon name="image" size={32} className="empty-icon" />
            <p>No image assets in this document.</p>
            <span>Drag &amp; drop PNG, JPG, WebP, or SVG files directly onto the canvas.</span>
          </div>
        ) : (
          filteredImages.map((img) => {
            const isLinked = img.source.type === 'link';
            const isMissing = img.isMissing;

            return (
              <div
                key={img.id}
                className={`link-item-row ${isMissing ? 'missing-asset' : ''}`}
                onClick={() => onSelectObject(img.id)}
              >
                <div className="link-item-preview">
                  {isMissing ? (
                    <VectoriaIcon name="brokenLink" size={20} className="missing-icon" />
                  ) : (
                    <img
                      src={img.source.type === 'embed' ? img.source.data : img.source.url}
                      alt={img.name}
                      className="link-thumbnail"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>

                <div className="link-item-info">
                  <div className="link-item-name">{img.name}</div>
                  <div className="link-item-meta">
                    {isLinked ? (
                      <span className={`link-status-badge ${isMissing ? 'status-missing' : 'status-linked'}`}>
                        {isMissing ? 'Missing External File' : 'Linked URL'}
                      </span>
                    ) : (
                      <span className="link-status-badge status-embedded">Embedded in VCT</span>
                    )}
                    <span className="link-dimensions">{img.naturalWidth}×{img.naturalHeight}px</span>
                  </div>
                  {isLinked && (
                    <div className="link-url-text" title={img.source.url}>
                      {img.source.url}
                    </div>
                  )}
                </div>

                <div className="link-item-actions" onClick={(e) => e.stopPropagation()}>
                  {isLinked && (
                    <button
                      className="action-btn-small"
                      title="Embed asset directly into document"
                      onClick={() => onEmbedImage(img.id)}
                    >
                      Embed
                    </button>
                  )}
                  <label className="action-btn-small relink-label" title="Relink to another file">
                    Relink
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onRelinkImage(img.id, file);
                      }}
                    />
                  </label>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
