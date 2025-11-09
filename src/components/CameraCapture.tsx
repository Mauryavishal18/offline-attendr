import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, Upload, CheckCircle } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface CameraCaptureProps {
  onAttendanceMarked?: () => void;
}

export function CameraCapture({ onAttendanceMarked }: CameraCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (file: File) => {
    setLoading(true);
    setSuccess(false);

    try {
      const result = await api.markAttendance(file);
      setSuccess(true);
      toast({
        title: "Attendance Marked!",
        description: `Welcome, ${result.studentName}. Your attendance has been recorded.`,
      });
      onAttendanceMarked?.();
      
      setTimeout(() => setSuccess(false), 3000);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  return (
    <Card className="glass-card p-8">
      <div className="text-center">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-32 h-32 mx-auto mb-6 rounded-full gradient-primary flex items-center justify-center"
        >
          {success ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <CheckCircle className="w-16 h-16 text-white" />
            </motion.div>
          ) : (
            <Camera className="w-16 h-16 text-white" />
          )}
        </motion.div>

        <h3 className="text-xl font-bold mb-2">Mark Your Attendance</h3>
        <p className="text-muted-foreground mb-6">
          Upload your photo to mark attendance using face recognition
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="gradient-primary"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full"
                />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload Photo
              </>
            )}
          </Button>
        </motion.div>

        <p className="text-xs text-muted-foreground mt-4">
          Supported formats: JPG, PNG, WEBP
        </p>
      </div>
    </Card>
  );
}
