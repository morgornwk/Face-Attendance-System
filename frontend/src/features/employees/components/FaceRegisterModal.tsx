import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Badge } from '../../../shared/components/ui/Badge';
import { Employee, FaceRegistrationResponse } from '../../../shared/types/employee';
import { saveEmployeeFacePhoto } from '../../../shared/utils/avatarHelper';
import { cn } from '../../../shared/utils/cn';

interface FaceRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onRegisterFace: (employeeId: string, file: File) => Promise<FaceRegistrationResponse>;
}

export const FaceRegisterModal: React.FC<FaceRegisterModalProps> = ({
  isOpen,
  onClose,
  employee,
  onRegisterFace,
}) => {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FaceRegistrationResponse | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch {
      setCameraError(
        'Unable to access camera. Please allow camera permissions in your browser or upload a photo directly.'
      );
      setCameraActive(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (isOpen && mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode, startCamera, stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setPreviewUrl(null);
      setError(null);
      setResult(null);
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setPreviewUrl(dataUrl);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File(
        [blob],
        `face_${employee?.employee_code || 'user'}_${Date.now()}.jpg`,
        { type: 'image/jpeg' }
      );
      setSelectedFile(file);
    }, 'image/jpeg', 0.95);
  };

  const handleRetake = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setResult(null);

    if (mode === 'camera' && (!mediaStreamRef.current || !mediaStreamRef.current.active)) {
      startCamera();
    } else if (videoRef.current && mediaStreamRef.current) {
      videoRef.current.play().catch(() => {});
      setCameraActive(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (!employee || !selectedFile) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await onRegisterFace(employee.id, selectedFile);
      setResult(res);
      if (previewUrl) {
        saveEmployeeFacePhoto(employee.id, previewUrl);
      }
      stopCamera();
    } catch (err: any) {
      setError(err?.message || 'Face registration failed. Ensure a single clear face is visible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Face Biometrics Registration"
      description={`Register AI face embedding for ${employee?.full_name} (${employee?.employee_code})`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {!result && (
          <div className="flex bg-neutral-100 p-1 rounded-2xl w-fit">
            <button
              onClick={() => {
                setMode('camera');
                setPreviewUrl(null);
                setSelectedFile(null);
              }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'camera'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Camera className="w-4 h-4" />
              Live Webcam
            </button>
            <button
              onClick={() => {
                setMode('upload');
                stopCamera();
                setPreviewUrl(null);
                setSelectedFile(null);
              }}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                mode === 'upload'
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
          </div>
        )}

        {result && (
          <div className="p-6 bg-emerald-50/70 border border-emerald-200 rounded-3xl text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-emerald-950">
                Biometrics Registered Successfully!
              </h4>
              <p className="text-xs text-emerald-700 mt-1">
                {result.message || 'Face embedding generated and loaded into memory index.'}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-1">
              {result.quality_score !== null && (
                <Badge variant="success">
                  Quality: {((result.quality_score || 0) * 100).toFixed(1)}%
                </Badge>
              )}
              <Badge variant="neutral">Model: {result.model_version}</Badge>
            </div>
            <div className="pt-2">
              <Button onClick={onClose} className="w-full sm:w-auto font-bold">
                Done
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Face Registration Error</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {!result && (
          <div className="relative overflow-hidden rounded-3xl bg-neutral-950 flex items-center justify-center min-h-[340px] border border-neutral-200/50">
            {mode === 'camera' && (
              <video
                ref={videoRef}
                playsInline
                muted
                className={cn(
                  'w-full h-[340px] object-cover scale-x-[-1]',
                  previewUrl && 'hidden'
                )}
              />
            )}

            {mode === 'camera' && !previewUrl && (
              <>
                {cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-neutral-400 text-center bg-neutral-900">
                    <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
                    <p className="text-sm">{cameraError}</p>
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-60 border-2 border-dashed border-emerald-400/90 rounded-[50%] shadow-lg" />
                    </div>
                    <div className="absolute bottom-4 inset-x-0 flex justify-center">
                      <Button
                        type="button"
                        onClick={captureSnapshot}
                        disabled={!cameraActive}
                        className="bg-white text-neutral-900 hover:bg-neutral-100 shadow-xl font-bold"
                      >
                        <Camera className="w-4 h-4 mr-2 text-emerald-600" />
                        Capture Face Snapshot
                      </Button>
                    </div>
                  </>
                )}
              </>
            )}

            {mode === 'upload' && !previewUrl && (
              <label className="w-full h-[340px] flex flex-col items-center justify-center cursor-pointer p-6 bg-neutral-50/50 hover:bg-neutral-100/50 transition-colors border-2 border-dashed border-neutral-300 rounded-3xl">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm border border-neutral-200 flex items-center justify-center mb-3 text-neutral-500">
                  <Upload className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-neutral-800">
                  Click or drag photo here
                </p>
                <p className="text-xs text-neutral-400 mt-1">
                  Supported formats: JPG, PNG (Single front-facing face)
                </p>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}

            {previewUrl && (
              <div className="relative w-full h-[340px] bg-black flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Face preview"
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={handleRetake}
                  className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm text-neutral-800 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg hover:bg-white active:scale-95 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-neutral-700" />
                  Retake Photo
                </button>
              </div>
            )}
          </div>
        )}

        {!result && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-neutral-500 font-medium">
              {previewUrl
                ? 'Ready to process biometrics'
                : 'Position face directly in the center guideline'}
            </span>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedFile || isSubmitting}
                isLoading={isSubmitting}
                className="font-bold"
              >
                Register Biometrics
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
