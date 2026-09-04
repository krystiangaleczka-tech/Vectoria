import React from 'react';
import type { DocumentModel, FillStyle, LiveEffect, ObjectStyle, ObjectId } from '@vectoria/core';
import { BLEND_MODES } from '@vectoria/core';
import { generateId } from '@vectoria/shared';
import { NumberInput, ColorControl, Button, ConfirmDialog } from '@vectoria/ui';

export interface AppearancePanelProps {
  document: DocumentModel;
  selectedObjectId: ObjectId | null;
  selectedObjectIds: readonly ObjectId[];
  onPatchStyle: (patch: Partial<ObjectStyle>) => void;
  onAddEffect: (effect: LiveEffect) => void;
  onUpdateEffect: (effectId: string, patch: Partial<LiveEffect>) => void;
  onRemoveEffect: (effectId: string) => void;
  onReorderEffect: (fromIndex: number, toIndex: number) => void;
  onToggleEffect: (effectId: string, visible: boolean) => void;
  onExpandEffects: () => void;
}

const EFFECT_TYPES: readonly { value: LiveEffect['type']; label: string }[] = [
  { value: 'dropShadow', label: 'Drop shadow' },
  { value: 'innerShadow', label: 'Inner shadow' },
  { value: 'glow', label: 'Glow' },
  { value: 'blur', label: 'Blur' },
  { value: 'roundedCorners', label: 'Rounded corners' },
  { value: 'distort', label: 'Distort' },
  { value: 'envelope', label: 'Envelope' },
  { value: 'perspective', label: 'Perspective' },
  { value: 'extrude', label: 'Extrude 3D' },
  { value: 'radialRepeat', label: 'Radial repeat' },
  { value: 'mirrorRepeat', label: 'Mirror repeat' },
  { value: 'gridRepeat', label: 'Grid repeat' },
  { value: 'svgFilter', label: 'SVG filter' },
];

const EXPANDABLE_TYPES: readonly string[] = ['roundedCorners', 'distort', 'envelope', 'perspective', 'radialRepeat', 'mirrorRepeat', 'gridRepeat', 'extrude'];

function makeEffect(type: LiveEffect['type']): LiveEffect {
  const id = generateId();
  const base = { id, visible: true };
  switch (type) {
    case 'dropShadow': return { ...base, type, offsetX: 4, offsetY: 4, blur: 8, color: '#000000', opacity: 0.5 };
    case 'innerShadow': return { ...base, type, offsetX: 2, offsetY: 2, blur: 6, color: '#000000', opacity: 0.5 };
    case 'glow': return { ...base, type, blur: 12, color: '#5caeff', opacity: 0.8 };
    case 'blur': return { ...base, type, radius: 4 };
    case 'roundedCorners': return { ...base, type, radius: 8 };
    case 'distort': return { ...base, type, variant: 'zigzag', amplitude: 4, frequency: 12 };
    case 'envelope': return { ...base, type, corners: [{ x: -20, y: -10 }, { x: 120, y: 0 }, { x: 110, y: 110 }, { x: 0, y: 120 }] };
    case 'perspective': return { ...base, type, corners: [{ x: -15, y: -8 }, { x: 115, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 108 }] };
    case 'extrude': return { ...base, type, depth: 24, angle: Math.PI / 4, steps: 8 };
    case 'radialRepeat': return { ...base, type, count: 8, radius: 80, startAngle: 0 };
    case 'mirrorRepeat': return { ...base, type, axis: 'x', offset: 8 };
    case 'gridRepeat': return { ...base, type, rows: 3, columns: 3, spacingX: 60, spacingY: 60 };
    case 'svgFilter': return { ...base, type, filterType: 'colorMatrix', params: { matrix: '1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 1 0' } };
    default: return { ...base, type: 'blur', radius: 4 };
  }
}

const effectLabel = (effect: LiveEffect): string => EFFECT_TYPES.find((entry) => entry.value === effect.type)?.label ?? effect.type;

const EFFECT_DISPLAY: Record<string, string> = {
  dropShadow: 'Drop shadow', innerShadow: 'Inner shadow', glow: 'Glow', blur: 'Blur',
  roundedCorners: 'Rounded corners', distort: 'Distort', envelope: 'Envelope',
  perspective: 'Perspective', extrude: 'Extrude 3D', radialRepeat: 'Radial repeat',
  mirrorRepeat: 'Mirror repeat', gridRepeat: 'Grid repeat', svgFilter: 'SVG filter',
};

/** Appearance panel (FX-008/009): one ordered stack view over the object style. */
export const AppearancePanel: React.FC<AppearancePanelProps> = ({
  document: _doc,
  selectedObjectId,
  selectedObjectIds,
  onPatchStyle,
  onAddEffect,
  onUpdateEffect,
  onRemoveEffect,
  onReorderEffect,
  onToggleEffect,
  onExpandEffects,
}) => {
  const [newEffectType, setNewEffectType] = React.useState<LiveEffect['type']>('dropShadow');
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [isExpandConfirmOpen, setIsExpandConfirmOpen] = React.useState(false);
  const object = selectedObjectId !== null ? _doc.objects[selectedObjectId] : null;
  const disabled = !object || object.locked;
  const style = object?.style;
  const effects = style?.effects ?? [];

  const expandable = effects.some((effect) => effect.visible && EXPANDABLE_TYPES.includes(effect.type));

  const handleExpand = (): void => {
    if (!expandable) return;
    setIsExpandConfirmOpen(true);
  };

  const move = (index: number, direction: -1 | 1): void => {
    const target = index + direction;
    if (target < 0 || target >= effects.length) return;
    onReorderEffect(index, target);
  };

  return (
    <div className="panel appearance-panel" data-testid="appearance-panel" aria-label="Appearance">
      <div className="panel-section-heading"><span>Appearance</span>{object ? <span className="panel-count">{escapeName(object.name)}</span> : null}</div>

      {!object && <p className="appearance-empty">Zaznacz obiekt, aby edytować jego wygląd.</p>}

      {style && (
        <>
          <section className="appearance-stack" aria-label="Fill, stroke and opacity">
            <div className="appearance-row">
              <ColorControl
                label="Fill"
                disabled={disabled}
                color={style.fill.type === 'solid' ? style.fill.color : null}
                onChange={(value) => value && onPatchStyle({ fill: { type: 'solid', color: value } })}
              />
              <span className="appearance-fill-kind">{fillKindLabel(style.fill)}</span>
            </div>
            <div className="appearance-row">
              <ColorControl
                label="Stroke"
                disabled={disabled || !style.stroke}
                color={style.stroke?.color ?? null}
                onChange={(value) => value && onPatchStyle({ stroke: { ...(style.stroke ?? { color: value, width: 2, lineCap: 'butt' as const, lineJoin: 'miter' as const, miterLimit: 4, dashArray: [], opacity: 1 }), color: value } })}
              />
              <NumberInput label="Width" value={style.stroke?.width ?? 0} min={0.1} decimals={1} disabled={disabled || !style.stroke} onChange={(value) => style.stroke && onPatchStyle({ stroke: { ...style.stroke, width: value } })} />
              <label className="dialog-label">Align
                <select data-testid="appearance-stroke-align" value={style.stroke?.align ?? 'center'} disabled={disabled || !style.stroke} onChange={(event) => style.stroke && onPatchStyle({ stroke: { ...style.stroke, align: event.target.value as 'center' | 'inside' | 'outside' } })}>
                  <option value="center">Center</option>
                  <option value="inside">Inside</option>
                  <option value="outside">Outside</option>
                </select>
              </label>
            </div>
            <div className="appearance-row">
              <label className="dialog-label">Dash / gap
                <input
                  data-testid="appearance-dash-array"
                  value={style.stroke?.dashArray.join(', ') ?? ''}
                  disabled={disabled || !style.stroke}
                  aria-label="Dash and gap lengths"
                  onChange={(event) => {
                    const values = event.target.value.split(',').map((part) => Number(part.trim()));
                    if (values.length > 0 && values.every((value) => Number.isFinite(value) && value >= 0) && style.stroke) {
                      onPatchStyle({ stroke: { ...style.stroke, dashArray: values } });
                    }
                  }}
                />
              </label>
            </div>
            <div className="appearance-row">
              <NumberInput data-testid="appearance-opacity" label="Opacity" value={style.opacity} min={0} max={1} step={0.05} decimals={2} disabled={disabled} onChange={(value) => onPatchStyle({ opacity: value })} />
              <label className="dialog-label">Blend
                <select data-testid="appearance-blend-mode" value={style.blendMode ?? 'normal'} disabled={disabled} onChange={(event) => onPatchStyle({ blendMode: event.target.value as ObjectStyle['blendMode'] })}>
                  {BLEND_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section aria-label="Effects">
            <div className="panel-section-heading"><span>Efekty ({effects.length})</span></div>
            {effects.length === 0 && <p className="appearance-empty">Brak efektów. Dodaj efekt poniżej.</p>}
            <ul className="appearance-effects" onDragOver={(event) => event.preventDefault()}>
              {effects.map((effect, index) => (
                <li
                  key={effect.id}
                  className={`appearance-effect ${effect.visible ? '' : 'is-disabled'} ${dragIndex === index ? 'is-dragging' : ''}`}
                  draggable={!disabled}
                  onDragStart={() => setDragIndex(index)}
                  onDragEnd={() => setDragIndex(null)}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragIndex !== null && dragIndex !== index) onReorderEffect(dragIndex, index);
                    setDragIndex(null);
                  }}
                >
                  <div className="appearance-effect-head">
                    <label className="appearance-effect-toggle">
                      <input
                        type="checkbox"
                        checked={effect.visible}
                        disabled={disabled}
                        aria-label={`${effectLabel(effect)} visibility`}
                        onChange={(event) => onToggleEffect(effect.id, event.target.checked)}
                      />
                      <span>{EFFECT_DISPLAY[effect.type] ?? effect.type}</span>
                    </label>
                    <span className="appearance-effect-actions">
                      <Button size="sm" variant="ghost" disabled={disabled || index === 0} aria-label={`Move ${effectLabel(effect)} up`} onClick={() => move(index, -1)}>↑</Button>
                      <Button size="sm" variant="ghost" disabled={disabled || index === effects.length - 1} aria-label={`Move ${effectLabel(effect)} down`} onClick={() => move(index, 1)}>↓</Button>
                      <Button size="sm" variant="ghost" disabled={disabled} aria-label={`Remove ${effectLabel(effect)}`} onClick={() => onRemoveEffect(effect.id)}>✕</Button>
                    </span>
                  </div>
                  <EffectParams effect={effect} disabled={disabled} onUpdate={(patch) => onUpdateEffect(effect.id, patch)} />
                </li>
              ))}
            </ul>
            <div className="appearance-add-effect">
              <label className="dialog-label">Efekt
                <select value={newEffectType} disabled={disabled} aria-label="Effect type" onChange={(event) => setNewEffectType(event.target.value as LiveEffect['type'])}>
                  {EFFECT_TYPES.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
                </select>
              </label>
              <Button size="sm" variant="secondary" disabled={disabled} data-testid="appearance-add-effect" onClick={() => onAddEffect(makeEffect(newEffectType))}>Dodaj</Button>
              <Button size="sm" variant="ghost" disabled={disabled || !expandable} title={expandable ? 'Zamień efekty na trwałą geometrię' : 'Expand dostępny dla efektów geometrycznych i powtórzeń'} onClick={handleExpand}>Expand</Button>
            </div>
          </section>
        </>
      )}
      {selectedObjectIds.length > 1 && <p className="appearance-empty">Zmiany zastosują się do {selectedObjectIds.length} zaznaczonych obiektów.</p>}

      {isExpandConfirmOpen && (
        <ConfirmDialog
          title="Konwersja efektów (Expand)"
          description="Expand spowoduje konwersję efektów na trwałą geometrię. Efekty znikną ze stosu (Undo przywróci). Kontynuować?"
          confirmLabel="Konwertuj"
          cancelLabel="Anuluj"
          destructive={false}
          testId="confirm-expand-effects"
          onConfirm={() => {
            onExpandEffects();
            setIsExpandConfirmOpen(false);
          }}
          onCancel={() => setIsExpandConfirmOpen(false)}
        />
      )}
    </div>
  );
};

function escapeName(name: string): string {
  return name.length > 24 ? `${name.slice(0, 24)}…` : name;
}

function fillKindLabel(fill: FillStyle): string {
  switch (fill.type) {
    case 'solid': return 'Solid';
    case 'none': return 'None';
    case 'linear-gradient': return 'Linear gradient';
    case 'radial-gradient': return 'Radial gradient';
    case 'angular-gradient': return 'Angular gradient';
    case 'pattern': return `Pattern: ${fill.kind}`;
    case 'texture': return 'Texture';
    case 'mesh-gradient': return 'Mesh gradient';
  }
}

/** Compact parameter editor for one effect row. */
const EffectParams: React.FC<{ effect: LiveEffect; disabled: boolean; onUpdate: (patch: Partial<LiveEffect>) => void }> = ({ effect, disabled, onUpdate }) => {
  switch (effect.type) {
    case 'dropShadow':
    case 'innerShadow':
      return (
        <div className="appearance-effect-params">
          <NumberInput label="X" value={effect.offsetX} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ offsetX: value })} />
          <NumberInput label="Y" value={effect.offsetY} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ offsetY: value })} />
          <NumberInput label="Blur" value={effect.blur} min={0} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ blur: value })} />
          <ColorControl label="Kolor" disabled={disabled} color={effect.color} onChange={(value) => value && onUpdate({ color: value })} />
          <NumberInput label="Alpha" value={effect.opacity} min={0} max={1} step={0.05} decimals={2} disabled={disabled} onChange={(value) => onUpdate({ opacity: value })} />
        </div>
      );
    case 'glow':
      return (
        <div className="appearance-effect-params">
          <NumberInput label="Blur" value={effect.blur} min={0} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ blur: value })} />
          <ColorControl label="Kolor" disabled={disabled} color={effect.color} onChange={(value) => value && onUpdate({ color: value })} />
          <NumberInput label="Alpha" value={effect.opacity} min={0} max={1} step={0.05} decimals={2} disabled={disabled} onChange={(value) => onUpdate({ opacity: value })} />
        </div>
      );
    case 'blur':
    case 'roundedCorners':
      return (
        <div className="appearance-effect-params">
          <NumberInput label="Radius" value={effect.radius} min={0} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ radius: value })} />
        </div>
      );
    case 'distort':
      return (
        <div className="appearance-effect-params">
          <label className="dialog-label">Wariant
            <select value={effect.variant} disabled={disabled} onChange={(event) => onUpdate({ variant: event.target.value as 'zigzag' | 'roughen' | 'pucker-bloat' })}>
              <option value="zigzag">Zigzag</option>
              <option value="roughen">Roughen</option>
              <option value="pucker-bloat">Pucker &amp; bloat</option>
            </select>
          </label>
          <NumberInput label="Amplitude" value={effect.amplitude} min={0} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ amplitude: value })} />
          <NumberInput label="Frequency" value={effect.frequency} min={1} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ frequency: value })} />
        </div>
      );
    case 'envelope':
    case 'perspective':
      return (
        <div className="appearance-effect-params">
          {(['TL', 'TR', 'BR', 'BL'] as const).map((cornerLabel, cornerIndex) => (
            <span key={cornerLabel} className="appearance-corner">
              <span className="appearance-corner-label">{cornerLabel}</span>
              <NumberInput label={`${cornerLabel} X`} value={effect.corners[cornerIndex]!.x} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ corners: effect.corners.map((corner, i) => i === cornerIndex ? { ...corner, x: value } : corner) as unknown as typeof effect.corners })} />
              <NumberInput label={`${cornerLabel} Y`} value={effect.corners[cornerIndex]!.y} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ corners: effect.corners.map((corner, i) => i === cornerIndex ? { ...corner, y: value } : corner) as unknown as typeof effect.corners })} />
            </span>
          ))}
        </div>
      );
    case 'extrude':
      return (
        <div className="appearance-effect-params">
          <NumberInput label="Depth" value={effect.depth} min={0} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ depth: value })} />
          <NumberInput label="Kąt°" value={(effect.angle * 180) / Math.PI} decimals={0} disabled={disabled} onChange={(value) => onUpdate({ angle: (value * Math.PI) / 180 })} />
          <NumberInput label="Kroki" value={effect.steps} min={1} max={64} decimals={0} disabled={disabled} onChange={(value) => onUpdate({ steps: Math.min(64, Math.max(1, Math.round(value))) })} />
        </div>
      );
    case 'radialRepeat':
      return (
        <div className="appearance-effect-params">
          <NumberInput label="Liczba" value={effect.count} min={2} max={360} decimals={0} disabled={disabled} onChange={(value) => onUpdate({ count: Math.min(360, Math.max(2, Math.round(value))) })} />
          <NumberInput label="Promień" value={effect.radius} min={0} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ radius: value })} />
          <NumberInput label="Start°" value={(effect.startAngle * 180) / Math.PI} decimals={0} disabled={disabled} onChange={(value) => onUpdate({ startAngle: (value * Math.PI) / 180 })} />
        </div>
      );
    case 'mirrorRepeat':
      return (
        <div className="appearance-effect-params">
          <label className="dialog-label">Oś
            <select value={effect.axis} disabled={disabled} onChange={(event) => onUpdate({ axis: event.target.value as 'x' | 'y' })}>
              <option value="x">X (pionowa)</option>
              <option value="y">Y (pozioma)</option>
            </select>
          </label>
          <NumberInput label="Offset" value={effect.offset} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ offset: value })} />
        </div>
      );
    case 'gridRepeat':
      return (
        <div className="appearance-effect-params">
          <NumberInput label="Wiersze" value={effect.rows} min={1} max={50} decimals={0} disabled={disabled} onChange={(value) => onUpdate({ rows: Math.min(50, Math.max(1, Math.round(value))) })} />
          <NumberInput label="Kolumny" value={effect.columns} min={1} max={50} decimals={0} disabled={disabled} onChange={(value) => onUpdate({ columns: Math.min(50, Math.max(1, Math.round(value))) })} />
          <NumberInput label="Odstęp X" value={effect.spacingX} min={0} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ spacingX: value })} />
          <NumberInput label="Odstęp Y" value={effect.spacingY} min={0} decimals={1} disabled={disabled} onChange={(value) => onUpdate({ spacingY: value })} />
        </div>
      );
    case 'svgFilter':
      return (
        <div className="appearance-effect-params">
          <label className="dialog-label">Typ
            <select value={effect.filterType} disabled={disabled} onChange={(event) => onUpdate({ filterType: event.target.value as 'colorMatrix' | 'turbulence' })}>
              <option value="colorMatrix">Color matrix</option>
              <option value="turbulence">Turbulence</option>
            </select>
          </label>
          {effect.filterType === 'colorMatrix' ? (
            <label className="dialog-label">Matrix (20 wartości)
              <input
                value={typeof effect.params.matrix === 'string' ? effect.params.matrix : ''}
                disabled={disabled}
                aria-label="Color matrix values"
                onChange={(event) => {
                  const values = event.target.value.split(/[\s,]+/).filter(Boolean);
                  if (values.length === 20 && values.every((value) => Number.isFinite(Number(value)))) {
                    onUpdate({ params: { ...effect.params, matrix: values.join(' ') } });
                  }
                }}
              />
            </label>
          ) : (
            <NumberInput label="Base freq" value={typeof effect.params.baseFrequency === 'number' ? effect.params.baseFrequency : 0.05} min={0.001} step={0.01} decimals={3} disabled={disabled} onChange={(value) => onUpdate({ params: { ...effect.params, baseFrequency: value } })} />
          )}
        </div>
      );
    default:
      return null;
  }
};
