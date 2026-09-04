import React, { useState } from 'react';
import type { DocumentModel, ObjectStyle, SavedObjectStyle, ColorPalette, SymbolDefinition } from '@vectoria/core';
import { VectoriaIcon } from '@vectoria/ui';
import { exportBrandKitToFile, importBrandKitFromFile } from '@vectoria/io';

export interface AssetsPanelProps {
  document: DocumentModel;
  onApplyObjectStyle?: (style: ObjectStyle) => void;
  onApplyPaletteColor?: (color: string) => void;
  onInsertSymbol?: (symbolId: string) => void;
  onCreateSymbolFromSelection?: () => void;
  onInsertStockSvg?: (svgData: string, name: string) => void;
  onApplyBrandFont?: (fontFamily: string) => void;
  onAddBrandLogo?: (file: File) => void;
  onImportBrandKit?: (brandKit: import('@vectoria/core').BrandKit) => void;
}

type AssetSection = 'all' | 'symbols' | 'components' | 'styles' | 'palettes' | 'icons' | 'stock' | 'brandKit';

const BUILTIN_ICONS = [
  { name: 'Star', svg: '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#eab308"/></svg>' },
  { name: 'Heart', svg: '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="#ef4444"/></svg>' },
  { name: 'Check Circle', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#10b981"/><path d="m9 12 2 2 4-4" stroke="#ffffff" stroke-width="2" fill="none"/></svg>' },
  { name: 'Shield', svg: '<svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#3b82f6"/></svg>' },
  { name: 'User Badge', svg: '<svg viewBox="0 0 24 24"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" fill="none" stroke="#6366f1" stroke-width="2"/><circle cx="12" cy="7" r="4" fill="#6366f1"/></svg>' },
  { name: 'Lightning', svg: '<svg viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#f59e0b"/></svg>' },
  { name: 'Chat Bubble', svg: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="#8b5cf6"/></svg>' },
  { name: 'Settings Gear', svg: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="#64748b"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" fill="#64748b"/></svg>' },
];

const BUILTIN_STOCK = [
  { name: 'Badge Award', svg: '<svg viewBox="0 0 32 32"><circle cx="16" cy="12" r="10" fill="#f59e0b"/><polygon points="12 20 8 30 16 26 24 30 20 20" fill="#d97706"/></svg>' },
  { name: 'Ribbon Banner', svg: '<svg viewBox="0 0 48 24"><polygon points="4 4 44 4 40 12 44 20 4 20 8 12" fill="#3b82f6"/></svg>' },
  { name: 'Hexagon Badge', svg: '<svg viewBox="0 0 32 32"><polygon points="16 2 28 8 28 24 16 30 4 24 4 8" fill="#10b981"/></svg>' },
  { name: 'Sunburst Crest', svg: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="8" fill="#ec4899"/><circle cx="16" cy="16" r="14" fill="none" stroke="#ec4899" stroke-width="2" stroke-dasharray="2,3"/></svg>' },
];

export const AssetsPanel: React.FC<AssetsPanelProps> = ({
  document: doc,
  onApplyObjectStyle,
  onApplyPaletteColor,
  onInsertSymbol,
  onCreateSymbolFromSelection,
  onInsertStockSvg,
  onApplyBrandFont,
  onAddBrandLogo,
  onImportBrandKit,
}) => {
  const [activeSection, setActiveSection] = useState<AssetSection>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const symbols: readonly SymbolDefinition[] = Object.values(doc.symbols ?? {});
  const brandSymbols = symbols.filter((s) => s.isBrandAsset);
  const objectStyles: readonly SavedObjectStyle[] = doc.objectStyles ?? [];
  const palettes: readonly ColorPalette[] = doc.palettes ?? [];
  const brandLogos = doc.brandKit?.logos ?? [];
  const brandFonts = doc.brandKit?.fontFamilies ?? ['Inter', 'Roboto', 'Montserrat'];

  const filteredSymbols = symbols.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredStyles = objectStyles.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredPalettes = palettes.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredIcons = BUILTIN_ICONS.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredStock = BUILTIN_STOCK.filter((i) =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <section className="dock-panel-content assets-panel" data-testid="assets-panel" aria-label="Zasoby">
      {/* Heading & Search */}
      <div className="panel-section-heading">
        <div className="panel-heading-row">
          <VectoriaIcon name="brandKit" size={16} />
          <span>Zasoby i Komponenty</span>
        </div>
        <span className="panel-count">{symbols.length + filteredStyles.length + filteredPalettes.length}</span>
      </div>

      <div className="layers-filter-bar">
        <div className="layers-search-box">
          <VectoriaIcon name="search" size={13} className="layers-search-icon" />
          <input
            type="search"
            placeholder="Szukaj w bibliotece…"
            aria-label="Szukaj w bibliotece"
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
          <option value="symbols">Symbole ({symbols.length})</option>
          <option value="brandKit">Brand Kit</option>
          <option value="icons">Ikony SVG ({BUILTIN_ICONS.length})</option>
          <option value="stock">Elementy Stock ({BUILTIN_STOCK.length})</option>
          <option value="styles">Style obiektów ({objectStyles.length})</option>
          <option value="palettes">Palety kolorów ({palettes.length})</option>
        </select>
      </div>

      <div className="assets-content-container">
        {/* Symbols Section (ASSET-018, ASSET-019, ASSET-020) */}
        {(activeSection === 'all' || activeSection === 'symbols') && (
          <div className="assets-section" data-testid="assets-symbols-section">
            <div className="assets-section-title">
              <VectoriaIcon name="symbol" size={14} />
              <span>Symbole ({filteredSymbols.length})</span>
              {onCreateSymbolFromSelection && (
                <button
                  type="button"
                  className="section-action-btn"
                  title="Utwórz nowy symbol z zaznaczenia"
                  onClick={onCreateSymbolFromSelection}
                >
                  <VectoriaIcon name="plus" size={12} />
                  <span>Nowy symbol</span>
                </button>
              )}
            </div>

            {filteredSymbols.length === 0 ? (
              <div className="assets-empty-notice">
                Brak symboli w dokumencie. Zaznacz obiekty i kliknij &quot;Nowy symbol&quot;.
              </div>
            ) : (
              <div className="assets-grid">
                {filteredSymbols.map((sym) => (
                  <button
                    key={sym.id}
                    type="button"
                    className="asset-card symbol-card"
                    onClick={() => onInsertSymbol?.(sym.id)}
                    title={`Wstaw instancję symbolu: ${sym.name} (${sym.bounds.width}×${sym.bounds.height}px)`}
                  >
                    <div className="asset-preview-box symbol-preview">
                      <VectoriaIcon name="symbol" size={24} className="symbol-icon-large" />
                    </div>
                    <span className="asset-card-label">{sym.name}</span>
                    <span className="asset-card-sub">{Math.round(sym.bounds.width)}×{Math.round(sym.bounds.height)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Brand Kit Section (ASSET-023, ASSET-024, ASSET-025, ASSET-026, SAAS-021) */}
        {(activeSection === 'all' || activeSection === 'brandKit') && (
          <div className="assets-section brand-kit-section" data-testid="assets-brandkit-section">
            <div className="assets-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <VectoriaIcon name="brandKit" size={14} />
                <span>Brand Kit</span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {doc.brandKit && (
                  <button
                    type="button"
                    data-testid="export-brandkit-btn"
                    title="Eksportuj Brand Kit do pliku .brandkit"
                    onClick={() => {
                      if (!doc.brandKit) return;
                      const json = exportBrandKitToFile(doc.brandKit);
                      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${(doc.name || 'Dokument').replace(/\s+/g, '_')}.brandkit`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="section-action-btn"
                    style={{ fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    Eksportuj
                  </button>
                )}
                {onImportBrandKit && (
                  <label
                    className="section-action-btn file-upload-label"
                    title="Importuj Brand Kit z pliku .brandkit"
                    style={{ fontSize: '11px', padding: '2px 6px', cursor: 'pointer' }}
                  >
                    <span>Importuj</span>
                    <input
                      type="file"
                      data-testid="import-brandkit-input"
                      accept=".brandkit,.json"
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const text = await file.text();
                          const imported = importBrandKitFromFile(text);
                          onImportBrandKit(imported);
                        } catch (err) {
                          alert(`Błąd importu Brand Kit: ${err instanceof Error ? err.message : String(err)}`);
                        }
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Brand Logos */}
            <div className="brand-subset">
              <div className="brand-subset-header">
                <span>Logotypy Marki ({brandLogos.length})</span>
                {onAddBrandLogo && (
                  <label className="section-action-btn file-upload-label" title="Dodaj logo do Brand Kit">
                    <VectoriaIcon name="plus" size={12} />
                    <span>Dodaj logo</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onAddBrandLogo(file);
                      }}
                    />
                  </label>
                )}
              </div>
              {brandLogos.length === 0 ? (
                <div className="assets-empty-notice-small">Brak zapisanych logotypów marki.</div>
              ) : (
                <div className="brand-logos-grid">
                  {brandLogos.map((logo) => (
                    <div key={logo.id} className="brand-logo-card">
                      {logo.imageUrl ? (
                        <img src={logo.imageUrl} alt={logo.name} className="brand-logo-thumb" />
                      ) : (
                        <VectoriaIcon name="image" size={20} />
                      )}
                      <span className="brand-logo-name">{logo.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Brand Fonts */}
            <div className="brand-subset">
              <div className="brand-subset-header">
                <span>Fonty Brandowe</span>
              </div>
              <div className="brand-fonts-list">
                {brandFonts.map((font) => (
                  <button
                    key={font}
                    type="button"
                    className="brand-font-pill"
                    style={{ fontFamily: font }}
                    onClick={() => onApplyBrandFont?.(font)}
                    title={`Zastosuj font marki: ${font}`}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Components */}
            {brandSymbols.length > 0 && (
              <div className="brand-subset">
                <div className="brand-subset-header">
                  <span>Komponenty Brandowe ({brandSymbols.length})</span>
                </div>
                <div className="assets-grid">
                  {brandSymbols.map((sym) => (
                    <button
                      key={sym.id}
                      type="button"
                      className="asset-card brand-component-card"
                      onClick={() => onInsertSymbol?.(sym.id)}
                      title={`Wstaw komponent: ${sym.name}`}
                    >
                      <div className="asset-preview-box">
                        <VectoriaIcon name="component" size={20} />
                      </div>
                      <span className="asset-card-label">{sym.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Icon Library Section (ASSET-021) */}
        {(activeSection === 'all' || activeSection === 'icons') && (
          <div className="assets-section" data-testid="assets-icons-section">
            <div className="assets-section-title">
              <VectoriaIcon name="star" size={14} />
              <span>Biblioteka Ikon SVG ({filteredIcons.length})</span>
            </div>
            <div className="assets-grid stock-grid">
              {filteredIcons.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  data-testid={`stock-asset-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="asset-card stock-card"
                  onClick={() => onInsertStockSvg?.(item.svg, item.name)}
                  title={`Wstaw wektorową ikonę: ${item.name}`}
                >
                  <div
                    className="asset-preview-box stock-preview"
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                  />
                  <span className="asset-card-label">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stock SVG Elements Section (ASSET-022) */}
        {(activeSection === 'all' || activeSection === 'stock') && (
          <div className="assets-section" data-testid="assets-stock-section">
            <div className="assets-section-title">
              <VectoriaIcon name="stockSvg" size={14} />
              <span>Elementy Dekoracyjne Stock ({filteredStock.length})</span>
            </div>
            <div className="assets-grid stock-grid">
              {filteredStock.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className="asset-card stock-card"
                  onClick={() => onInsertStockSvg?.(item.svg, item.name)}
                  title={`Wstaw element stockowy: ${item.name}`}
                >
                  <div
                    className="asset-preview-box stock-preview"
                    dangerouslySetInnerHTML={{ __html: item.svg }}
                  />
                  <span className="asset-card-label">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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
      </div>
    </section>
  );
};
