const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];

export function isBinaryFile(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase();
  if (!ext) return false;
  const binaryExts = new Set([
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'svg',
    'mp3', 'mp4', 'wav', 'avi', 'mov', 'mkv', 'flac', 'ogg',
    'zip', 'tar', 'gz', 'bz2', '7z', 'rar',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'exe', 'dll', 'so', 'dylib', 'bin',
    'woff', 'woff2', 'ttf', 'otf', 'eot',
    'pyc', 'pyo', 'class', 'o', 'obj',
  ]);
  return binaryExts.has(ext);
}

export function shouldIgnorePath(path: string): boolean {
  const segments = path.split(/[/\\]/);
  return segments.some((seg) => IGNORED_DIRS.includes(seg));
}
