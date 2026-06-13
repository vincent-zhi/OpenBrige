import qrcode from 'qrcode-terminal';

export function generateConnectURL(
  host: string,
  port: number,
  protocol: 'http' | 'https' = 'http',
): string {
  return `${protocol}://${host}:${port}`;
}

/**
 * Generate a QR code ASCII art string for terminal display.
 * Uses qrcode-terminal to produce a real scannable QR code.
 */
export function generateQRCodeASCII(url: string): Promise<string> {
  return new Promise<string>((resolve) => {
    qrcode.generate(url, { small: true }, (qr: string) => {
      resolve(qr);
    });
  });
}

/**
 * Print a QR code directly to the console.
 */
export function printQRCode(url: string): void {
  qrcode.generate(url, { small: true });
}
