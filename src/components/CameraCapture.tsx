import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, X, RotateCcw, CheckCircle } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

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
  const [rollNumber, setRollNumber] = useState("");
  const [studentName, setStudentName] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceStableCount, setFaceStableCount] = useState(0);
  const [showInputs, setShowInputs] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const detectionLoopRef = useRef<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initializeFaceDetector();
    return () => {
      stopCamera();
      if (detectionLoopRef.current) {
        cancelAnimationFrame(detectionLoopRef.current);
      }
    };
  }, []);

  const initializeFaceDetector = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        minDetectionConfidence: 0.5
      });
      faceDetectorRef.current = detector;
      console.log("Face detector initialized");
    } catch (error) {
      console.error("Failed to initialize face detector:", error);
    }
  };

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
          // Start face detection loop
          if (faceDetectorRef.current) {
            detectFaces();
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
    if (detectionLoopRef.current) {
      cancelAnimationFrame(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    setIsCameraOpen(false);
    setFaceDetected(false);
    setFaceStableCount(0);
  };

  const detectFaces = async () => {
    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    
    if (!video || !overlayCanvas || !faceDetectorRef.current || !isCameraOpen) {
      return;
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = overlayCanvas.getContext('2d');
      if (!ctx) return;

      // Match overlay canvas to video dimensions
      overlayCanvas.width = video.videoWidth;
      overlayCanvas.height = video.videoHeight;
      
      // Clear previous drawings
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      try {
        const detections = faceDetectorRef.current.detectForVideo(video, performance.now());
        
        if (detections.detections && detections.detections.length > 0) {
          setFaceDetected(true);
          setFaceStableCount(prev => prev + 1);

          // Draw bounding boxes and indicators
          detections.detections.forEach((detection) => {
            const box = detection.boundingBox;
            if (box) {
              // Draw bounding box
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 3;
              ctx.strokeRect(box.originX, box.originY, box.width, box.height);
              
              // Draw corner indicators
              const cornerSize = 20;
              ctx.fillStyle = '#10b981';
              // Top-left
              ctx.fillRect(box.originX, box.originY, cornerSize, 3);
              ctx.fillRect(box.originX, box.originY, 3, cornerSize);
              // Top-right
              ctx.fillRect(box.originX + box.width - cornerSize, box.originY, cornerSize, 3);
              ctx.fillRect(box.originX + box.width - 3, box.originY, 3, cornerSize);
              // Bottom-left
              ctx.fillRect(box.originX, box.originY + box.height - 3, cornerSize, 3);
              ctx.fillRect(box.originX, box.originY + box.height - cornerSize, 3, cornerSize);
              // Bottom-right
              ctx.fillRect(box.originX + box.width - cornerSize, box.originY + box.height - 3, cornerSize, 3);
              ctx.fillRect(box.originX + box.width - 3, box.originY + box.height - cornerSize, 3, cornerSize);
            }
          });

          // Auto-capture after face is stable for ~1.5 seconds (45 frames at 30fps)
          if (faceStableCount >= 45 && !capturedImage) {
            capturePhoto();
          }
        } else {
          setFaceDetected(false);
          setFaceStableCount(0);
        }
      } catch (error) {
        console.error("Face detection error:", error);
      }
    }

    // Continue detection loop
    if (isCameraOpen) {
      detectionLoopRef.current = requestAnimationFrame(detectFaces);
    }
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
    setFaceStableCount(0);
    startCamera();
  };

  const handleStartCamera = () => {
    if (!rollNumber.trim() || !studentName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both roll number and name first.",
        variant: "destructive",
      });
      return;
    }
    setShowInputs(false);
    startCamera();
  };

  const handleMarkAttendance = async () => {
    if (!rollNumber.trim() || !studentName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both roll number and name.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    setSuccess(false);

    try {
      const result = await api.markAttendance(rollNumber, studentName);
      setSuccess(true);
      stopCamera();
      toast({
        title: "Attendance Marked!",
        description: `Welcome, ${result.studentName}. Your attendance has been recorded.`,
      });
      onAttendanceMarked?.();
      
      setTimeout(() => {
        setSuccess(false);
        setCapturedImage(null);
        setRollNumber("");
        setStudentName("");
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark attendance. Please try again.",
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
                    <>
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
                      <canvas
                        ref={overlayCanvasRef}
                        className="absolute inset-0 w-full h-full transform-gpu scale-x-[-1] pointer-events-none"
                      />
                      {faceDetected && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500/90 text-white px-4 py-2 rounded-full text-sm font-medium"
                        >
                          Face Detected - Hold Still
                        </motion.div>
                      )}
                    </>
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
                        onClick={() => {
                          stopCamera();
                          setShowInputs(true);
                        }}
                        className="gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </Button>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          onClick={capturePhoto}
                          className="gradient-primary gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          Capture Now
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
                  <div className="text-center space-y-2">
                    <p className="text-sm font-medium text-foreground">
                      {rollNumber} - {studentName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {faceDetected 
                        ? "Hold still... Auto-capturing in " + Math.max(0, Math.ceil((45 - faceStableCount) / 30)) + "s"
                        : "Position your face in the frame"
                      }
                    </p>
                  </div>
                )}
              </motion.div>
            ) : showInputs ? (
              /* Initial State - Input Form */
              <>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-32 h-32 mx-auto mb-6 rounded-full gradient-primary flex items-center justify-center"
                >
                  <Camera className="w-16 h-16 text-white" />
                </motion.div>

                <h3 className="text-xl font-bold mb-4">Mark Your Attendance</h3>
                <p className="text-muted-foreground mb-6">
                  Enter your details and we'll detect your face automatically
                </p>

                <div className="space-y-4 max-w-md mx-auto">
                  <div>
                    <label htmlFor="rollNumber" className="block text-sm font-medium mb-2 text-left">
                      Roll Number
                    </label>
                    <input
                      id="rollNumber"
                      type="text"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      placeholder="e.g., 2301640130144"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="studentName" className="block text-sm font-medium mb-2 text-left">
                      Full Name
                    </label>
                    <input
                      id="studentName"
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g., Vishal Maurya"
                      className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="pt-2"
                  >
                    <Button
                      size="lg"
                      onClick={handleStartCamera}
                      disabled={!rollNumber.trim() || !studentName.trim()}
                      className="w-full gradient-primary gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Start Face Detection
                    </Button>
                  </motion.div>
                </div>
              </>
            ) : null}
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </Card>
  );
}
