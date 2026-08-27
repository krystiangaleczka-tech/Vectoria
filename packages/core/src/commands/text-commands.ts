import type { DocumentModel, TextObject, TextFrameObject, ObjectId, PathObject, TextRun } from '../model/types.js';
import type { Command } from './command.js';
import { convertTextToOutlines, type FontOutlineProvider } from '../geometry/text-outlines.js';

export class CreateTextObjectCommand implements Command {
  readonly type = 'create-text-object';
  readonly label = 'Create Text';
  readonly description = 'Create Artistic Text object';

  constructor(private readonly object: TextObject) {}

  execute(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.object.layerId];
    if (!layer) return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.object.id]: this.object,
      },
      layers: {
        ...doc.layers,
        [layer.id]: {
          ...layer,
          objectIds: [...layer.objectIds, this.object.id],
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.object.layerId];
    const remainingObjects = { ...doc.objects };
    delete remainingObjects[this.object.id];

    return {
      ...doc,
      objects: remainingObjects,
      layers: layer
        ? {
            ...doc.layers,
            [layer.id]: {
              ...layer,
              objectIds: layer.objectIds.filter((id) => id !== this.object.id),
            },
          }
        : doc.layers,
      updatedAt: new Date().toISOString(),
    };
  }
}

export class CreateTextFrameCommand implements Command {
  readonly type = 'create-text-frame';
  readonly label = 'Create Text Frame';
  readonly description = 'Create Paragraph Text Frame object';

  constructor(private readonly object: TextFrameObject) {}

  execute(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.object.layerId];
    if (!layer) return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.object.id]: this.object,
      },
      layers: {
        ...doc.layers,
        [layer.id]: {
          ...layer,
          objectIds: [...layer.objectIds, this.object.id],
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const layer = doc.layers[this.object.layerId];
    const remainingObjects = { ...doc.objects };
    delete remainingObjects[this.object.id];

    return {
      ...doc,
      objects: remainingObjects,
      layers: layer
        ? {
            ...doc.layers,
            [layer.id]: {
              ...layer,
              objectIds: layer.objectIds.filter((id) => id !== this.object.id),
            },
          }
        : doc.layers,
      updatedAt: new Date().toISOString(),
    };
  }
}

export class SetTextContentCommand implements Command {
  readonly type = 'set-text-content';
  readonly label = 'Edit Text';
  readonly description = 'Update text content';

  private previousText: string = '';
  private previousRuns?: readonly TextRun[];

  constructor(
    private readonly objectId: ObjectId,
    private readonly nextText: string,
    private readonly nextRuns?: readonly TextRun[],
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || obj.locked || (obj.type !== 'text' && obj.type !== 'text-frame')) return doc;

    this.previousText = obj.text;
    this.previousRuns = obj.runs;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: {
          ...obj,
          text: this.nextText,
          ...(this.nextRuns !== undefined ? { runs: this.nextRuns } : {}),
        } as TextObject | TextFrameObject,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || (obj.type !== 'text' && obj.type !== 'text-frame')) return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: {
          ...obj,
          text: this.previousText,
          ...(this.previousRuns !== undefined ? { runs: this.previousRuns } : {}),
        } as TextObject | TextFrameObject,
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

function isValidTextPropertyUpdate(properties: TextPropertiesUpdate, type: TextObject['type'] | TextFrameObject['type']): boolean {
  if (properties.fontSize !== undefined && (!Number.isFinite(properties.fontSize) || properties.fontSize <= 0)) return false;
  if (properties.lineHeight !== undefined && (!Number.isFinite(properties.lineHeight) || properties.lineHeight <= 0)) return false;
  if (properties.letterSpacing !== undefined && !Number.isFinite(properties.letterSpacing)) return false;
  if (properties.columnCount !== undefined && (type !== 'text-frame' || !Number.isInteger(properties.columnCount) || properties.columnCount < 1 || properties.columnCount > 8)) return false;
  if (properties.columnGutter !== undefined && (!Number.isFinite(properties.columnGutter) || properties.columnGutter < 0)) return false;
  if (properties.paragraphSpacing !== undefined && (!Number.isFinite(properties.paragraphSpacing) || properties.paragraphSpacing < 0)) return false;
  if (properties.indent !== undefined && (!Number.isFinite(properties.indent) || properties.indent < 0)) return false;
  if (properties.variableAxes && Object.values(properties.variableAxes).some((value) => !Number.isFinite(value))) return false;
  return true;
}

export type TextPropertiesUpdate = Partial<
  Pick<
    TextFrameObject,
    | 'fontFamily'
    | 'fontSize'
    | 'fontWeight'
    | 'fontStyle'
    | 'letterSpacing'
    | 'lineHeight'
    | 'textAlign'
    | 'kerning'
    | 'columnCount'
    | 'columnGutter'
    | 'paragraphSpacing'
    | 'indent'
    | 'listType'
    | 'variableAxes'
  >
>;

export class UpdateTextPropertiesCommand implements Command {
  readonly type = 'update-text-properties';
  readonly label = 'Update Typography';
  readonly description = 'Update text typography properties';

  private previousProperties: TextPropertiesUpdate = {};

  constructor(
    private readonly objectId: ObjectId,
    private readonly properties: TextPropertiesUpdate,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || (obj.type !== 'text' && obj.type !== 'text-frame') || !isValidTextPropertyUpdate(this.properties, obj.type)) return doc;

    this.previousProperties = {
      fontFamily: obj.fontFamily,
      fontSize: obj.fontSize,
      fontWeight: obj.fontWeight,
      fontStyle: obj.fontStyle,
      letterSpacing: obj.letterSpacing,
      lineHeight: obj.lineHeight,
      textAlign: obj.textAlign,
      kerning: obj.kerning,
      variableAxes: obj.variableAxes,
      ...(obj.type === 'text-frame'
        ? {
            columnCount: obj.columnCount,
            columnGutter: obj.columnGutter,
            paragraphSpacing: obj.paragraphSpacing,
            indent: obj.indent,
            listType: obj.listType,
          }
        : {}),
    };

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: {
          ...obj,
          ...this.properties,
        } as TextObject | TextFrameObject,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || (obj.type !== 'text' && obj.type !== 'text-frame')) return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: {
          ...obj,
          ...this.previousProperties,
        } as TextObject | TextFrameObject,
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

export class SetTextOnPathCommand implements Command {
  readonly type = 'set-text-on-path';
  readonly label = 'Text on Path';
  readonly description = 'Attach or detach text along path';

  private previousPathId?: ObjectId;

  constructor(
    private readonly textObjectId: ObjectId,
    private readonly pathId?: ObjectId,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.textObjectId];
    if (!obj || obj.type !== 'text') return doc;

    this.previousPathId = obj.pathId;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.textObjectId]: {
          ...obj,
          pathId: this.pathId,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.textObjectId];
    if (!obj || obj.type !== 'text') return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.textObjectId]: {
          ...obj,
          pathId: this.previousPathId,
        },
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

export class ConvertTextToOutlinesCommand implements Command {
  readonly type = 'convert-text-to-outlines';
  readonly label = 'Convert to Outlines';
  readonly description = 'Convert text object to vector path outlines';

  private previousObject: TextObject | TextFrameObject | null = null;
  private generatedPath: PathObject | null = null;

  constructor(private readonly objectId: ObjectId, private readonly provider?: FontOutlineProvider) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || (obj.type !== 'text' && obj.type !== 'text-frame')) return doc;

    this.previousObject = obj;
    this.generatedPath = convertTextToOutlines(obj, this.provider);

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: this.generatedPath,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    if (!this.previousObject) return doc;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: this.previousObject,
      },
      updatedAt: new Date().toISOString(),
    };
  }
}

export class BatchReplaceTextCommand implements Command {
  readonly type = 'batch-replace-text';
  readonly label = 'Replace All Text';
  readonly description = 'Replace text occurrences across document';

  private previousTexts: Record<ObjectId, string> = {};
  private previousRuns: Record<ObjectId, readonly TextRun[] | undefined> = {};

  constructor(
    private readonly targetIds: readonly ObjectId[],
    private readonly findPattern: string | RegExp,
    private readonly replacement: string,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const updatedObjects = { ...doc.objects };
    this.previousTexts = {};
    this.previousRuns = {};
    let hasChanges = false;

    for (const id of this.targetIds) {
      const obj = doc.objects[id];
      if (obj && (obj.type === 'text' || obj.type === 'text-frame')) {
        const replaced = replaceTextPreservingRuns(obj.text, obj.runs, this.findPattern, this.replacement);
        if (replaced.text !== obj.text) {
          this.previousTexts[id] = obj.text;
          this.previousRuns[id] = obj.runs;
          updatedObjects[id] = {
            ...obj,
            text: replaced.text,
            ...(replaced.runs !== undefined ? { runs: replaced.runs } : {}),
          } as TextObject | TextFrameObject;
          hasChanges = true;
        }
      }
    }

    if (!hasChanges) return doc;

    return {
      ...doc,
      objects: updatedObjects,
      updatedAt: new Date().toISOString(),
    };
  }

  undo(doc: DocumentModel): DocumentModel {
    const updatedObjects = { ...doc.objects };
    let hasChanges = false;

    for (const [id, prevText] of Object.entries(this.previousTexts)) {
      const obj = doc.objects[id];
      if (obj && (obj.type === 'text' || obj.type === 'text-frame')) {
        updatedObjects[id] = {
          ...obj,
          text: prevText,
          ...(this.previousRuns[id] !== undefined ? { runs: this.previousRuns[id] } : {}),
        } as TextObject | TextFrameObject;
        hasChanges = true;
      }
    }

    if (!hasChanges) return doc;

    return {
      ...doc,
      objects: updatedObjects,
      updatedAt: new Date().toISOString(),
    };
  }
}

interface TextReplacement {
  readonly start: number;
  readonly end: number;
}

interface ReplacedText {
  readonly text: string;
  readonly runs?: readonly TextRun[];
}

function replaceTextPreservingRuns(text: string, runs: readonly TextRun[] | undefined, pattern: string | RegExp, replacement: string): ReplacedText {
  const replacements = collectTextReplacements(text, pattern);
  if (replacements.length === 0) return { text, runs };
  const codePoints = Array.from(text);
  const replacementCodePoints = Array.from(replacement);
  const output: string[] = [];
  const outputRuns: TextRun[] = [];
  let sourceIndex = 0;

  const append = (value: string[], start: number, end: number, styleSource: number): void => {
    for (let index = start; index < end; index += 1) {
      const style = runs?.find((run) => styleSource >= run.start && styleSource < run.start + run.length);
      appendStyledCodePoint(output, outputRuns, value[index]!, style);
      styleSource += 1;
    }
  };

  for (const match of replacements) {
    append(codePoints, sourceIndex, match.start, sourceIndex);
    const replacementStyle = runs?.find((run) => match.start >= run.start && match.start < run.start + run.length);
    for (const codePoint of replacementCodePoints) appendStyledCodePoint(output, outputRuns, codePoint, replacementStyle);
    sourceIndex = match.end;
  }
  append(codePoints, sourceIndex, codePoints.length, sourceIndex);
  return { text: output.join(''), runs: outputRuns.length > 0 ? outputRuns : undefined };
}

function appendStyledCodePoint(output: string[], outputRuns: TextRun[], codePoint: string, style: TextRun | undefined): void {
  const outputIndex = output.length;
  output.push(codePoint);
  if (!style) return;
  const last = outputRuns[outputRuns.length - 1];
  if (last && sameRunStyle(last, style) && last.start + last.length === outputIndex) {
    outputRuns[outputRuns.length - 1] = { ...last, length: last.length + 1 };
  } else {
    outputRuns.push({ ...style, start: outputIndex, length: 1 });
  }
}

function sameRunStyle(first: TextRun, second: TextRun): boolean {
  return first.fontFamily === second.fontFamily && first.fontSize === second.fontSize && first.fontWeight === second.fontWeight && first.fontStyle === second.fontStyle && first.baselineShift === second.baselineShift && first.fill === second.fill && first.isPlaceholder === second.isPlaceholder;
}

function collectTextReplacements(text: string, pattern: string | RegExp): TextReplacement[] {
  if (typeof pattern === 'string' && pattern.length === 0) return [];
  const flags = typeof pattern === 'string' ? 'gu' : pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const source = typeof pattern === 'string' ? escapeRegExp(pattern) : pattern.source;
  const regex = new RegExp(source, flags);
  const replacements: TextReplacement[] = [];
  for (const match of text.matchAll(regex)) {
    const utf16Start = match.index ?? 0;
    const start = Array.from(text.slice(0, utf16Start)).length;
    replacements.push({ start, end: start + Array.from(match[0]).length });
  }
  return replacements;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
