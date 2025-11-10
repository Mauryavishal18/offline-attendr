import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, RotateCcw, CheckCircle } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onAttendanceMarked?: () => void;
}

export function CameraCapture({ onAttendanceMarked }: CameraCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<Blob | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Reliably bind stream to video element when camera opens
  useEffect(() => {
    if (!isCameraOpen || !stream || !videoRef.current) return;
    
    const video = videoRef.current;
    video.srcObject = stream;
    
    const onLoaded = () => {
      video.play()
        .then(() => {
          console.log('Video playing (effect)');
          const track = stream.getVideoTracks()[0];
          if (track) {
            console.log('Track settings:', track.getSettings());
          }
        })
        .catch(err => console.error('Video play failed:', err));
    };
    
    video.onloadedmetadata = onLoaded;
    
    return () => {
      video.onloadedmetadata = null;
    };
  }, [isCameraOpen, stream]);

  const startCamera = async () => {
    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: "Camera Not Supported",
        description: "Your browser doesn't support camera access.",
        variant: "destructive",
      });
      console.error('getUserMedia not supported');
      return;
    }

    setIsCameraLoading(true);
    console.log('Opening camera...');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      
      console.log('Stream obtained:', mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        console.log('Video element ready:', videoRef.current);
        
        // Explicitly play the video
        try {
          await videoRef.current.play();
          console.log('Video playing successfully');
        } catch (playError) {
          console.error('Error playing video:', playError);
        }
      }
      
      setStream(mediaStream);
      setIsCameraOpen(true);
      console.log('Camera opened successfully');
    } catch (error: any) {
      console.error('Camera error:', error);
      
      let errorMessage = "Failed to access camera. Please try again.";
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage = "Camera access denied. Please allow camera permissions in your browser settings.";
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage = "No camera found on your device.";
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage = "Camera is already in use by another application.";
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = "Camera doesn't meet the required specifications.";
      }
      
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('Camera track stopped:', track.kind);
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      const context = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      if (context) {
        context.save();
        context.scale(-1, 1);
        context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        context.restore();
        
        canvas.toBlob((blob) => {
          if (blob) {
            setCapturedImage(blob);
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setSuccess(false);
    startCamera();
  };

  const handleMarkAttendance = async () => {
    if (!capturedImage) return;
    
    setLoading(true);
    setSuccess(false);

    try {
      const file = new File([capturedImage], "attendance.jpg", { type: "image/jpeg" });
      const result = await api.markAttendance(file);
      setSuccess(true);
      toast({
        title: "Attendance Marked!",
        description: `Welcome, ${result.studentName}. Your attendance has been recorded.`,
      });
      onAttendanceMarked?.();
      
      setTimeout(() => {
        setSuccess(false);
        setCapturedImage(null);
      }, 3000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark attendance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-card p-8">
      <div className="text-center">
        {/* Success State */}
        {success ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <div className="w-32 h-32 mx-auto mb-6 rounded-full gradient-primary flex items-center justify-center">
              <CheckCircle className="w-16 h-16 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Attendance Marked!</h3>
            <p className="text-muted-foreground">Your attendance has been recorded successfully</p>
          </motion.div>
        ) : (
          <>
            {/* Camera Preview or Captured Image */}
            {isCameraOpen || capturedImage ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="relative w-full max-w-md mx-auto aspect-square rounded-2xl overflow-hidden border-4 border-primary/20 bg-black">
                  {isCameraOpen && (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      onLoadedMetadata={() => {
                        console.log('Video metadata loaded');
                      }}
                      className="absolute inset-0 w-full h-full object-cover transform-gpu scale-x-[-1]"
                    />
                  )}
                  {capturedImage && (
                    <img
                      src={URL.createObjectURL(capturedImage)}
                      alt="Captured"
                      className="absolute inset-0 w-full h-full object-cover transform-gpu scale-x-[-1]"
                    />
                  )}
                </div>

                <div className="flex gap-3 justify-center">
                  {isCameraOpen && (
                    <>
                      <Button
                        variant="outline"
                        onClick={stopCamera}
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        Close
                      </Button>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={capturePhoto}
                          className="gradient-primary gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Capture Photo
                        </Button>
                      </motion.div>
                    </>
                  )}
                  
                  {capturedImage && (
                    <>
                      <Button
                        variant="outline"
                        onClick={retakePhoto}
                        disabled={loading}
                        className="gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Retake
                      </Button>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={handleMarkAttendance}
                          disabled={loading}
                          className="gradient-primary gap-2"
                        >
                          {loading ? (
                            <>
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                              />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              Mark Attendance
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </>
                  )}
                </div>

                {isCameraOpen && (
                  <p className="text-xs text-muted-foreground">
                    Position your face in the frame and capture
                  </p>
                )}
              </motion.div>
            ) : (
              /* Initial State */
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-32 h-32 mx-auto mb-6 rounded-full gradient-primary flex items-center justify-center"
                >
                  <Camera className="w-16 h-16 text-white" />
                </motion.div>

                <h3 className="text-xl font-bold mb-2">Mark Your Attendance</h3>
                <p className="text-muted-foreground mb-6">
                  Use your camera to capture your face for attendance
                </p>

                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    onClick={startCamera}
                    disabled={isCameraLoading}
                    className="gradient-primary gap-2"
                  >
                    {isCameraLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        Opening Camera...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        Open Camera
                      </>
                    )}
                  </Button>
                </motion.div>

                <p className="text-xs text-muted-foreground mt-4">
                  Please allow camera access when prompted
                </p>
              </>
            )}
          </>
        )}

        {/* Hidden canvas for capturing frames */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </Card>
  );
}
