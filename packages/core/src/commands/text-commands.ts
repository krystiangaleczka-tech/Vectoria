import type { DocumentModel, TextObject, TextFrameObject, ObjectId, PathObject, TextRun } from '../model/types.js';
import type { Command } from './command.js';
import { convertTextToOutlines } from '../geometry/text-outlines.js';

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
    if (!obj || (obj.type !== 'text' && obj.type !== 'text-frame')) return doc;

    this.previousText = obj.text;
    this.previousRuns = obj.runs;

    return {
      ...doc,
      objects: {
        ...doc.objects,
        [this.objectId]: {
          ...obj,
          text: this.nextText,
          runs: this.nextRuns,
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
          runs: this.previousRuns,
        } as TextObject | TextFrameObject,
      },
      updatedAt: new Date().toISOString(),
    };
  }
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
    if (!obj || (obj.type !== 'text' && obj.type !== 'text-frame')) return doc;

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

  constructor(private readonly objectId: ObjectId) {}

  execute(doc: DocumentModel): DocumentModel {
    const obj = doc.objects[this.objectId];
    if (!obj || (obj.type !== 'text' && obj.type !== 'text-frame')) return doc;

    this.previousObject = obj;
    this.generatedPath = convertTextToOutlines(obj);

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

  constructor(
    private readonly targetIds: readonly ObjectId[],
    private readonly findPattern: string | RegExp,
    private readonly replacement: string,
  ) {}

  execute(doc: DocumentModel): DocumentModel {
    const updatedObjects = { ...doc.objects };
    let hasChanges = false;

    for (const id of this.targetIds) {
      const obj = doc.objects[id];
      if (obj && (obj.type === 'text' || obj.type === 'text-frame')) {
        this.previousTexts[id] = obj.text;
        const newText = obj.text.replace(this.findPattern, this.replacement);
        if (newText !== obj.text) {
          updatedObjects[id] = {
            ...obj,
            text: newText,
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
