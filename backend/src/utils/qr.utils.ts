import QRCode from 'qrcode';

/**
 * Generates a base64 Data URL representation of a QR Code
 * containing booking verification details.
 */
export const generateQRCodeDataURL = async (text: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 250,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });
  } catch (error) {
    console.error('QR code generation failed:', error);
    return '';
  }
};
