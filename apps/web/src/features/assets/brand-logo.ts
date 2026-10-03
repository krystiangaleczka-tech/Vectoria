export function inferImageMimeType(source: string): string | undefined {
  const trimmed = source.trim();
  const dataUrlMime = /^data:([^;,\s]+)/i.exec(trimmed)?.[1]?.toLowerCase();
  if (dataUrlMime) return dataUrlMime;

  const path = trimmed.split(/[?#]/, 1)[0]?.toLowerCase() ?? '';
  const extension = path.match(/\.([a-z0-9]+)$/)?.[1];
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'avif':
      return 'image/avif';
    default:
      return undefined;
  }
}

export function isSvgBrandLogoFile(file: Pick<File, 'name' | 'type'>): boolean {
  return file.type.toLowerCase() === 'image/svg+xml' || /\.svg$/i.test(file.name);
}
