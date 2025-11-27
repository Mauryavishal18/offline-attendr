import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Camera, TrendingUp, User, Clock, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/ThemeToggle";
import { api, AttendanceRecord } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths } from "date-fns";

export default function StudentProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadData();
    // Load saved profile image from localStorage
    const savedImage = localStorage.getItem(`profile_image_${user?.id}`);
    if (savedImage) {
      setProfileImage(savedImage);
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const studentRoll = user?.studentRoll || "STU001";
      const records = await api.getAttendanceRecords(undefined, undefined, studentRoll);
      setAttendanceRecords(records);
    } catch (error) {
      console.error("Failed to load attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Image = reader.result as string;
      setProfileImage(base64Image);
      localStorage.setItem(`profile_image_${user?.id}`, base64Image);
      setUploadingImage(false);
      toast({
        title: "Profile Updated",
        description: "Your profile picture has been updated successfully.",
      });
    };
    reader.onerror = () => {
      setUploadingImage(false);
      toast({
        title: "Upload Failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(file);
  };

  // Calculate statistics
  const totalRecords = attendanceRecords.length;
  const presentRecords = attendanceRecords.filter((r) => r.status === "present").length;
  const absentRecords = attendanceRecords.filter((r) => r.status === "absent").length;
  const attendancePercentage = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;

  // Calculate monthly attendance data for chart
  const getMonthlyAttendanceData = () => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return {
        month: format(date, "MMM yyyy"),
        start: startOfMonth(date),
        end: endOfMonth(date),
      };
    });

    return last6Months.map(({ month, start, end }) => {
      const monthRecords = attendanceRecords.filter((r) => {
        const recordDate = parseISO(r.date);
        return recordDate >= start && recordDate <= end;
      });
      const present = monthRecords.filter((r) => r.status === "present").length;
      const total = monthRecords.length;
      return {
        month,
        present,
        absent: total - present,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      };
    });
  };

  // Calculate attendance streak
  const getAttendanceStreak = () => {
    const sortedRecords = [...attendanceRecords]
      .filter((r) => r.status === "present")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    if (sortedRecords.length === 0) return 0;
    
    let streak = 1;
    for (let i = 1; i < sortedRecords.length; i++) {
      const current = new Date(sortedRecords[i - 1].date);
      const previous = new Date(sortedRecords[i].date);
      const diffDays = Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  const monthlyData = getMonthlyAttendanceData();
  const currentStreak = getAttendanceStreak();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 glass border-b border-border"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/student")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">My Profile</h1>
          </div>
          <ThemeToggle />
        </div>
      </motion.header>

      <main className="container mx-auto p-6 max-w-6xl">
        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-32 w-32 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-80" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Profile Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative">
                      <Avatar className="h-32 w-32 border-4 border-primary/20">
                        <AvatarImage src={profileImage || undefined} />
                        <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                          {user?.name?.charAt(0) || "S"}
                        </AvatarFallback>
                      </Avatar>
                      <label
                        htmlFor="profile-upload"
                        className="absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                      >
                        <Camera className="w-5 h-5 text-primary-foreground" />
                        <input
                          id="profile-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          disabled={uploadingImage}
                        />
                      </label>
                    </div>
                    <div className="text-center sm:text-left">
                      <h2 className="text-2xl font-bold">{user?.name || "Student"}</h2>
                      <p className="text-muted-foreground">{user?.email}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Roll: {user?.studentRoll || "N/A"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          Student
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Days</p>
                      <p className="text-2xl font-bold">{totalRecords}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/10">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Present</p>
                      <p className="text-2xl font-bold text-success">{presentRecords}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <XCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Absent</p>
                      <p className="text-2xl font-bold text-destructive">{absentRecords}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <TrendingUp className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Streak</p>
                      <p className="text-2xl font-bold">{currentStreak} days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Attendance Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Overall Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Attendance Rate</span>
                      <span className="text-2xl font-bold">{attendancePercentage}%</span>
                    </div>
                    <Progress value={attendancePercentage} className="h-3" />
                    <p className="text-sm text-muted-foreground">
                      {attendancePercentage >= 75
                        ? "Great job! Keep up the excellent attendance."
                        : attendancePercentage >= 50
                        ? "Good progress. Try to improve your attendance rate."
                        : "Your attendance needs improvement. Please attend more classes."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Monthly Attendance Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Attendance Trend (Last 6 Months)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <defs>
                          <linearGradient id="colorPercentage" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="month"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                        />
                        <YAxis
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          domain={[0, 100]}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [`${value}%`, "Attendance"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="percentage"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#colorPercentage)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Attendance History Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Complete Attendance History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {attendanceRecords.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No attendance records found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Method</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendanceRecords
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map((record, index) => (
                              <motion.tr
                                key={record.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.02 }}
                                className="border-b border-border/50"
                              >
                                <TableCell className="font-medium">
                                  {format(parseISO(record.date), "PPP")}
                                </TableCell>
                                <TableCell>{record.time}</TableCell>
                                <TableCell>
                                  <span
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                      record.status === "present"
                                        ? "bg-success/10 text-success"
                                        : "bg-destructive/10 text-destructive"
                                    }`}
                                  >
                                    {record.status === "present" ? (
                                      <CheckCircle className="w-3 h-3" />
                                    ) : (
                                      <XCircle className="w-3 h-3" />
                                    )}
                                    {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                  </span>
                                </TableCell>
                                <TableCell className="capitalize">{record.method}</TableCell>
                              </motion.tr>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
