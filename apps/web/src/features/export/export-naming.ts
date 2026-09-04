/**
 * Sanitizes a string to a safe, clean filename slug.
 */
export function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_.]/g, '') || 'export'
  );
}

export interface NamingContext {
  artboard?: string;
  layer?: string;
  object?: string;
  scale?: number;
  format?: string;
  ext: string;
}

/**
 * Resolves a template string containing tokens like `{artboard}`, `{layer}`, `{scale}`, `{format}`, `{ext}`
 * into a sanitized file name.
 *
 * @param template Pattern string, e.g. '{artboard}@{scale}x.{ext}'.
 * @param context Dynamic values for the tokens.
 * @returns Sanitized and fully resolved filename.
 */
export function resolveFileName(template: string, context: NamingContext): string {
  const artboardVal = slugify(context.artboard ?? 'artboard');
  const layerVal = slugify(context.layer ?? 'layer');
  const objectVal = slugify(context.object ?? 'selection');
  const scaleVal = String(context.scale ?? 1);
  const formatVal = slugify(context.format ?? context.ext);
  const extVal = slugify(context.ext);

  let output = template
    .replaceAll('{artboard}', artboardVal)
    .replaceAll('{layer}', layerVal)
    .replaceAll('{object}', objectVal)
    .replaceAll('{scale}', scaleVal)
    .replaceAll('{format}', formatVal)
    .replaceAll('{ext}', extVal);

  // If user provided a template without extension, append it
  if (!output.endsWith(`.${extVal}`)) {
    output = `${output}.${extVal}`;
  }

  return output;
}
