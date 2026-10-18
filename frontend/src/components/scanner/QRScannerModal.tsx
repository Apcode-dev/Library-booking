import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  X,
  Camera,
  RefreshCw,
  AlertCircle,
  Upload,
  SwitchCamera,
  CheckCircle2,
  ScanLine,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (code: string) => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
}) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerId = 'qr-reader-container';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    setScannerError(null);
    setLastScanned(null);

    // Initialize camera listing and auto-start back camera
    initScanner();

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const initScanner = async () => {
    try {
      // Create scanner instance if not exists
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      // Query available video devices
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setScannerError('No camera found on this device. You can upload an image pass below.');
        return;
      }

      setCameras(devices);

      // Prefer back / environment camera on mobile phones
      const backCam = devices.find(
        (d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
      );
      const chosenId = backCam ? backCam.id : devices[0].id;
      setSelectedCameraId(chosenId);

      await startCamera(chosenId);
    } catch (err: any) {
      console.warn('Camera initialization error:', err);
      let msg = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || String(err).includes('Permission denied')) {
        msg = 'Camera permission was denied. Please allow camera access in browser permissions or upload an image.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera found on this device. You can upload an image instead.';
      }
      setScannerError(msg);
    }
  };

  const startCamera = async (cameraId: string) => {
    if (!scannerRef.current) return;

    try {
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      setScannerError(null);
      setIsScanning(true);

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scannerRef.current.start(
        cameraId,
        config,
        (decodedText) => {
          handleDetectedCode(decodedText);
        },
        () => {
          // Frame scan error / QR not detected yet in this frame - ignore
        }
      );
    } catch (err: any) {
      console.error('Error starting camera stream:', err);
      setIsScanning(false);
      setScannerError(err.message || 'Unable to start camera video stream.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      setIsScanning(false);
    }
  };

  const handleDetectedCode = (rawText: string) => {
    if (!rawText) return;

    // Extract bookingCode if encoded as JSON payload
    let finalCode = rawText.trim();
    try {
      const parsed = JSON.parse(finalCode);
      if (parsed.code) {
        finalCode = parsed.code.trim();
      } else if (parsed.bookingCode) {
        finalCode = parsed.bookingCode.trim();
      }
    } catch (_) {
      // Plain text bookingCode string like "LIB-1741-98"
    }

    setLastScanned(finalCode);
    toast.success(`Scanned Pass: ${finalCode}`, { icon: '📷' });

    // Stop camera and pass code to parent
    stopScanner();
    onScanSuccess(finalCode);
    onClose();
  };

  // Switch to next available camera
  const handleSwitchCamera = async () => {
    if (cameras.length <= 1) {
      toast('Only 1 camera detected on this device.', { icon: 'ℹ️' });
      return;
    }

    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex];
    setSelectedCameraId(nextCamera.id);
    await startCamera(nextCamera.id);
    toast.success(`Switched to: ${nextCamera.label || 'Next Camera'}`);
  };

  // Fallback: Scan QR from an image file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
      }

      toast.loading('Analyzing pass image...', { id: 'img-scan' });
      const decodedText = await scannerRef.current.scanFile(file, true);
      toast.dismiss('img-scan');
      handleDetectedCode(decodedText);
    } catch (err: any) {
      toast.dismiss('img-scan');
      toast.error('Could not detect a valid QR code in that image. Please try another photo.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl text-white flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Live Camera QR Scanner</h3>
              <p className="text-[11px] text-slate-400">Scan student digital pass at reception</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Video Area */}
        <div className="p-5 flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="relative w-full aspect-square max-w-[320px] bg-black rounded-2xl overflow-hidden border-2 border-indigo-500/40 shadow-inner flex items-center justify-center">
            {/* HTML5 QR Container */}
            <div
              id={containerId}
              className="w-full h-full [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
            />

            {/* Glowing scan target overlay */}
            {isScanning && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-indigo-400 rounded-2xl relative shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                  {/* Corner Accent markers */}
                  <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg"></div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg"></div>
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg"></div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-indigo-400 rounded-br-lg"></div>

                  {/* Animated laser scanline */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent absolute top-0 animate-pulse animate-bounce"></div>
                </div>
              </div>
            )}

            {/* Error Overlay */}
            {scannerError && (
              <div className="absolute inset-0 bg-slate-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3 z-10">
                <AlertCircle className="w-10 h-10 text-rose-400" />
                <span className="text-xs text-rose-300 font-semibold max-w-[240px]">
                  {scannerError}
                </span>
                <button
                  onClick={initScanner}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retry Camera
                </button>
              </div>
            )}
          </div>

          {/* Scanner Control Bar */}
          <div className="flex items-center justify-between w-full max-w-[320px] px-1">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ScanLine className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              Point camera at student's QR code
            </span>

            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleSwitchCamera}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold rounded-lg border border-slate-700 transition flex items-center gap-1"
                title="Switch Camera (Front/Rear)"
              >
                <SwitchCamera className="w-3.5 h-3.5" />
                Switch Cam
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer & Image File Fallback */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between gap-3">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-2"
          >
            <Upload className="w-4 h-4 text-slate-400" />
            Upload QR Image
          </button>

          <button
            type="button"
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold rounded-xl transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;
