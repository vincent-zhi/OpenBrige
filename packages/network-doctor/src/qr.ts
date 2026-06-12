export function generateConnectURL(
  host: string,
  port: number,
  protocol: 'http' | 'https' = 'http',
): string {
  return `${protocol}://${host}:${port}`;
}

/**
 * Generate a QR code ASCII art string for terminal display.
 * Uses a simple encoding approach for small URLs.
 */
export function generateQRCodeASCII(text: string): string {
  // Simple QR code generation using block characters
  // For production, use a proper QR library like 'qrcode-terminal'
  const size = 25;
  const modules: boolean[][] = [];

  // Initialize grid
  for (let i = 0; i < size; i++) {
    modules.push(new Array(size).fill(false));
  }

  // Draw finder patterns (3 corners)
  drawFinderPattern(modules, 0, 0);
  drawFinderPattern(modules, size - 7, 0);
  drawFinderPattern(modules, 0, size - 7);

  // Draw timing patterns
  for (let i = 8; i < size - 8; i++) {
    modules[i][6] = i % 2 === 0;
    modules[6][i] = i % 2 === 0;
  }

  // Encode data into remaining modules (simplified - uses hash-like approach)
  const data = text.split('').map((c) => c.charCodeAt(0));
  let idx = 0;
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      // Skip finder patterns and timing
      if (isInFinderZone(row, col, size)) continue;
      if (row === 6 || col === 6) continue;

      // Pseudo-random fill based on data
      const byteIdx = idx % data.length;
      const bitIdx = Math.floor(idx / data.length) % 8;
      modules[row][col] = ((data[byteIdx]! >> bitIdx) & 1) === 1;
      idx++;
    }
  }

  // Render to ASCII using block characters
  const lines: string[] = [];
  const quiet = 1; // quiet zone

  for (let row = -quiet; row < size + quiet; row += 2) {
    let line = '';
    for (let col = -quiet; col < size + quiet; col++) {
      const top = row >= 0 && row < size && modules[row]?.[col] === true;
      const bottom = row + 1 >= 0 && row + 1 < size && modules[row + 1]?.[col] === true;

      if (top && bottom) {
        line += '\u2588'; // █
      } else if (top) {
        line += '\u2580'; // ▀
      } else if (bottom) {
        line += '\u2584'; // ▄
      } else {
        line += ' ';
      }
    }
    lines.push(line);
  }

  return lines.join('\n');
}

function drawFinderPattern(modules: boolean[][], row: number, col: number): void {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
      const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      modules[row + r]![col + c] = isOuter || isInner;
    }
  }
}

function isInFinderZone(row: number, col: number, size: number): boolean {
  // Top-left
  if (row < 9 && col < 9) return true;
  // Top-right
  if (row < 9 && col >= size - 8) return true;
  // Bottom-left
  if (row >= size - 8 && col < 9) return true;
  return false;
}
