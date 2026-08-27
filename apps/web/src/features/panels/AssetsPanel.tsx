import React, { useState } from 'react';
import type { DocumentModel, ObjectStyle, SavedObjectStyle, ColorPalette } from '@vectoria/core';
import { VectoriaIcon } from '@vectoria/ui';

export interface AssetsPanelProps {
  document: DocumentModel;
  onApplyObjectStyle?: (style: ObjectStyle) => void;
  onApplyPaletteColor?: (color: string) => void;
  onInsertSymbol?: (symbolId: string) => void;
  onInsertComponent?: (componentId: string) => void;
}

type AssetSection = 'all' | 'styles' | 'palettes' | 'symbols' | 'components';

export const AssetsPanel: React.FC<AssetsPanelProps> = ({
  document: doc,
  onApplyObjectStyle,
  onApplyPaletteColor,
  onInsertSymbol,
  onInsertComponent,
}) => {
  void onInsertSymbol;
  void onInsertComponent;
  const [activeSection, setActiveSection] = useState<AssetSection>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const objectStyles: readonly SavedObjectStyle[] = doc.objectStyles ?? [];
  const palettes: readonly ColorPalette[] = doc.palettes ?? [];

  // Filtered styles
  const filteredStyles = objectStyles.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Filtered palettes
  const filteredPalettes = palettes.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <section className="dock-panel-content assets-panel" data-testid="assets-panel" aria-label="Zasoby">
      {/* Heading & Search */}
      <div className="panel-section-heading">
        <span>Zasoby i Komponenty</span>
        <span className="panel-count">{filteredStyles.length + filteredPalettes.length}</span>
      </div>

      <div className="layers-filter-bar">
        <div className="layers-search-box">
          <VectoriaIcon name="search" size={13} className="layers-search-icon" />
          <input
            type="search"
            placeholder="Szukaj w zasobach…"
            aria-label="Szukaj w zasobach"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="layers-filter-select"
          aria-label="Kategoria zasobów"
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as AssetSection)}
        >
          <option value="all">Wszystkie</option>
          <option value="styles">Style obiektów</option>
          <option value="palettes">Palety kolorów</option>
          <option value="symbols">Symbole</option>
          <option value="components">Komponenty</option>
        </select>
      </div>

      <div className="assets-content-container">
        {/* Object Styles Section */}
        {(activeSection === 'all' || activeSection === 'styles') && (
          <div className="assets-section" data-testid="assets-styles-section">
            <div className="assets-section-title">
              <VectoriaIcon name="sliders" size={14} />
              <span>Style obiektów ({filteredStyles.length})</span>
            </div>
            {filteredStyles.length === 0 ? (
              <div className="assets-empty-notice">Brak zapisanych stylów w dokumencie.</div>
            ) : (
              <div className="assets-grid">
                {filteredStyles.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="asset-card"
                    onClick={() => onApplyObjectStyle?.(item.style)}
                    title={`Zastosuj styl: ${item.name}`}
                  >
                    <div
                      className="asset-preview-box"
                      style={{
                        backgroundColor: item.style.fill.type === 'solid' ? item.style.fill.color : '#e2e8f0',
                        opacity: item.style.opacity,
                        border: item.style.stroke ? `${item.style.stroke.width}px solid ${item.style.stroke.color}` : '1px solid var(--color-border)',
                      }}
                    />
                    <span className="asset-card-label">{item.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Color Palettes Section */}
        {(activeSection === 'all' || activeSection === 'palettes') && (
          <div className="assets-section" data-testid="assets-palettes-section">
            <div className="assets-section-title">
              <VectoriaIcon name="grid" size={14} />
              <span>Palety kolorów ({filteredPalettes.length})</span>
            </div>
            {filteredPalettes.length === 0 ? (
              <div className="assets-empty-notice">Brak palet kolorów w dokumencie.</div>
            ) : (
              <div className="assets-palettes-list">
                {filteredPalettes.map((palette) => (
                  <div key={palette.id} className="asset-palette-row">
                    <span className="asset-palette-name">{palette.name}</span>
                    <div className="asset-swatches-row">
                      {palette.colors.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="asset-color-swatch"
                          style={{ backgroundColor: c.color }}
                          title={`${c.name} (${c.color})`}
                          onClick={() => onApplyPaletteColor?.(c.color)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Symbols Section (Ready for EPIC-12) */}
        {(activeSection === 'all' || activeSection === 'symbols') && (
          <div className="assets-section" data-testid="assets-symbols-section">
            <div className="assets-section-title">
              <VectoriaIcon name="layers" size={14} />
              <span>Symbole (0)</span>
            </div>
            <div className="assets-empty-notice">Brak symboli w dokumencie. Zaznacz obiekt i utwórz symbol (EPIC-12).</div>
          </div>
        )}

        {/* Components Section (Ready for EPIC-12) */}
        {(activeSection === 'all' || activeSection === 'components') && (
          <div className="assets-section" data-testid="assets-components-section">
            <div className="assets-section-title">
              <VectoriaIcon name="folder" size={14} />
              <span>Komponenty (0)</span>
            </div>
            <div className="assets-empty-notice">Brak komponentów w bibliotece.</div>
          </div>
        )}
      </div>
    </section>
  );
};
