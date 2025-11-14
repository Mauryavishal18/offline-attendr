import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CameraCapture } from "@/components/CameraCapture";
import { AttendanceChart } from "@/components/AttendanceChart";
import { api } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

export default function StudentDashboard() {
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const { logout, user } = useAuth();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Use actual logged-in student's roll number
      const studentRoll = user?.studentRoll || "STU001";
      const data = await api.getStudentStats(studentRoll);
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 glass border-b border-border"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">Student Dashboard</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto p-6 max-w-6xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold mb-2">Welcome Back, John!</h2>
            <p className="text-muted-foreground">Track your attendance and stay updated</p>
          </motion.div>

          {/* Camera Capture */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <CameraCapture onAttendanceMarked={loadStats} />
          </motion.div>

          {/* Attendance Stats */}
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-48" />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Skeleton className="h-80" />
                <Skeleton className="h-80" />
              </div>
            </div>
          ) : (
            <>
              {/* Progress Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Your Attendance Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Overall Attendance</span>
                        <span className="text-2xl font-bold">{percentage}%</span>
                      </div>
                      <Progress value={percentage} className="h-3" />
                      <div className="grid grid-cols-3 gap-4 pt-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">{stats.total}</div>
                          <div className="text-xs text-muted-foreground">Total Days</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-success">{stats.present}</div>
                          <div className="text-xs text-muted-foreground">Present</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-destructive">{stats.absent}</div>
                          <div className="text-xs text-muted-foreground">Absent</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Charts */}
              <AttendanceChart
                present={stats.present}
                absent={stats.absent}
                total={stats.total}
              />
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
