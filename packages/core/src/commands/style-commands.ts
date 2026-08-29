import { generateId, normalizeColor } from '@vectoria/shared';
import type { Command } from './command.js';
import type { ColorPalette, DocumentModel, ObjectId, ObjectStyle, PaletteColor, SavedObjectStyle } from '../model/types.js';

function replaceStyleColors(style: ObjectStyle, from: string, to: string): ObjectStyle {
  const replace = (color: string): string => color.toLowerCase() === from.toLowerCase() ? to : color;
  const fill = style.fill.type === 'solid'
    ? { ...style.fill, color: replace(style.fill.color) }
    : style.fill.type === 'pattern'
      ? { ...style.fill, foreground: replace(style.fill.foreground), background: replace(style.fill.background) }
      : style.fill.type === 'none'
        ? style.fill
        : { ...style.fill, stops: style.fill.stops.map((stop) => ({ ...stop, color: replace(stop.color) })) };
  const effects = style.effects?.map((effect) => 
    effect.type === 'dropShadow' ? { ...effect, color: replace(effect.color) } : effect
  );
  return { ...style, fill, stroke: style.stroke ? { ...style.stroke, color: replace(style.stroke.color) } : null, effects };
}

abstract class StyleObjectCommand implements Command {
  abstract readonly type: string;
  abstract readonly description: string;
  protected previous = new Map<ObjectId, ObjectStyle>();
  abstract execute(doc: DocumentModel): DocumentModel;

  protected applyStyles(doc: DocumentModel, updates: ReadonlyMap<ObjectId, ObjectStyle>): DocumentModel {
    const objects = { ...doc.objects };
    this.previous.clear();
    let changed = false;
    for (const [id, style] of updates) {
      const object = doc.objects[id];
      if (!object || object.locked || object.style === style) continue;
      this.previous.set(id, object.style);
      objects[id] = { ...object, style };
      changed = true;
    }
    return changed ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }

  undo(doc: DocumentModel): DocumentModel {
    const objects = { ...doc.objects };
    for (const [id, style] of this.previous) if (objects[id]) objects[id] = { ...objects[id], style };
    return this.previous.size ? { ...doc, objects, updatedAt: new Date().toISOString() } : doc;
  }
}

export class ApplyStyleCommand extends StyleObjectCommand {
  readonly type: string = 'ApplyStyle';
  readonly description: string = 'Apply style';
  constructor(private readonly objectIds: readonly ObjectId[], private readonly style: ObjectStyle) { super(); }
  execute(doc: DocumentModel): DocumentModel { return this.applyStyles(doc, new Map(this.objectIds.map((id) => [id, this.style]))); }
}

export class UpdateGlobalColorCommand implements Command {
  readonly type = 'UpdateGlobalColor';
  readonly description = 'Update global color';
  private previous: DocumentModel | undefined;
  constructor(private readonly paletteId: string, private readonly colorId: string, private readonly color: string) {}
  execute(doc: DocumentModel): DocumentModel {
    const normalized = normalizeColor(this.color);
    const palettes = doc.palettes ?? [];
    const palette = palettes.find((candidate) => candidate.id === this.paletteId);
    const old = palette?.colors.find((candidate) => candidate.id === this.colorId);
    if (!normalized || !old) return doc;
    this.previous = doc;
    const nextPalettes = palettes.map((candidate) => candidate.id !== this.paletteId ? candidate : { ...candidate, colors: candidate.colors.map((candidateColor) => candidateColor.id === this.colorId ? { ...candidateColor, color: normalized } : candidateColor) });
    const objects = Object.fromEntries(Object.entries(doc.objects).map(([id, object]) => [id, object.locked ? object : { ...object, style: replaceStyleColors(object.style, old.color, normalized) }]));
    return { ...doc, palettes: nextPalettes, objects, updatedAt: new Date().toISOString() };
  }
  undo(_doc: DocumentModel): DocumentModel { return this.previous ?? _doc; }
}

export class UpsertPaletteCommand implements Command {
  readonly type = 'UpsertPalette';
  readonly description = 'Update palette';
  private previous: readonly ColorPalette[] | undefined;
  constructor(private readonly palette: ColorPalette) {}
  execute(doc: DocumentModel): DocumentModel { this.previous = doc.palettes ?? []; return { ...doc, palettes: [...this.previous.filter((candidate) => candidate.id !== this.palette.id), this.palette], updatedAt: new Date().toISOString() }; }
  undo(doc: DocumentModel): DocumentModel { return this.previous ? { ...doc, palettes: this.previous, updatedAt: new Date().toISOString() } : doc; }
}

export class DeletePaletteCommand implements Command {
  readonly type = 'DeletePalette';
  readonly description = 'Delete palette';
  private previous: readonly ColorPalette[] | undefined;
  constructor(private readonly paletteId: string) {}
  execute(doc: DocumentModel): DocumentModel {
    const palettes = doc.palettes ?? [];
    if (!palettes.some((palette) => palette.id === this.paletteId)) return doc;
    this.previous = palettes;
    return { ...doc, palettes: palettes.filter((palette) => palette.id !== this.paletteId), updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel { return this.previous ? { ...doc, palettes: this.previous, updatedAt: new Date().toISOString() } : doc; }
}

export class DuplicatePaletteCommand implements Command {
  readonly type = 'DuplicatePalette';
  readonly description = 'Duplicate palette';
  private previous: readonly ColorPalette[] | undefined;
  private readonly duplicate: ColorPalette;

  constructor(palette: ColorPalette) {
    this.duplicate = {
      ...palette,
      id: generateId(),
      name: `${palette.name} copy`,
      colors: palette.colors.map((color) => ({ ...color, id: generateId() })),
      ...(palette.swatches ? { swatches: palette.swatches.map((swatch) => ({ ...swatch, id: generateId() })) } : {}),
    };
  }

  execute(doc: DocumentModel): DocumentModel {
    const palettes = doc.palettes ?? [];
    if (palettes.some((palette) => palette.id === this.duplicate.id)) return doc;
    this.previous = palettes;
    return { ...doc, palettes: [...palettes, this.duplicate], updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, palettes: this.previous, updatedAt: new Date().toISOString() } : doc;
  }
}

export class DeleteObjectStyleCommand implements Command {
  readonly type = 'DeleteObjectStyle';
  readonly description = 'Delete object style';
  private previous: readonly SavedObjectStyle[] | undefined;
  constructor(private readonly styleId: string) {}
  execute(doc: DocumentModel): DocumentModel {
    const styles = doc.objectStyles ?? [];
    if (!styles.some((style) => style.id === this.styleId)) return doc;
    this.previous = styles;
    return { ...doc, objectStyles: styles.filter((style) => style.id !== this.styleId), updatedAt: new Date().toISOString() };
  }
  undo(doc: DocumentModel): DocumentModel { return this.previous ? { ...doc, objectStyles: this.previous, updatedAt: new Date().toISOString() } : doc; }
}

export class DuplicateObjectStyleCommand implements Command {
  readonly type = 'DuplicateObjectStyle';
  readonly description = 'Duplicate object style';
  private previous: readonly SavedObjectStyle[] | undefined;
  private readonly duplicate: SavedObjectStyle;

  constructor(style: SavedObjectStyle) {
    this.duplicate = { ...style, id: generateId(), name: `${style.name} copy` };
  }

  execute(doc: DocumentModel): DocumentModel {
    const styles = doc.objectStyles ?? [];
    if (styles.some((style) => style.id === this.duplicate.id)) return doc;
    this.previous = styles;
    return { ...doc, objectStyles: [...styles, this.duplicate], updatedAt: new Date().toISOString() };
  }

  undo(doc: DocumentModel): DocumentModel {
    return this.previous ? { ...doc, objectStyles: this.previous, updatedAt: new Date().toISOString() } : doc;
  }
}

export class SaveObjectStyleCommand implements Command {
  readonly type = 'SaveObjectStyle';
  readonly description = 'Save object style';
  private previous: readonly SavedObjectStyle[] | undefined;
  constructor(private readonly style: SavedObjectStyle) {}
  execute(doc: DocumentModel): DocumentModel { this.previous = doc.objectStyles ?? []; return { ...doc, objectStyles: [...this.previous.filter((candidate) => candidate.id !== this.style.id), this.style], updatedAt: new Date().toISOString() }; }
  undo(doc: DocumentModel): DocumentModel { return this.previous ? { ...doc, objectStyles: this.previous, updatedAt: new Date().toISOString() } : doc; }
}

export class ApplySavedObjectStyleCommand extends StyleObjectCommand {
  readonly type = 'ApplySavedObjectStyle';
  readonly description = 'Apply saved style';
  constructor(private readonly objectIds: readonly ObjectId[], private readonly saved: SavedObjectStyle) { super(); }
  execute(doc: DocumentModel): DocumentModel { return this.applyStyles(doc, new Map(this.objectIds.map((id) => [id, this.saved.style]))); }
}

export class ApplyPaletteColorCommand extends ApplyStyleCommand {
  readonly type = 'ApplyPaletteColor';
  readonly description = 'Apply palette color';
  constructor(objectIds: readonly ObjectId[], color: PaletteColor, style: ObjectStyle) { super(objectIds, { ...style, fill: { type: 'solid', color: color.color } }); }
}
