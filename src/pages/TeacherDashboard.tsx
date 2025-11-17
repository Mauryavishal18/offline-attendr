import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, UserCheck, UserX, LogOut, Menu, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { StatCard } from "@/components/StatCard";
import { AttendanceTable } from "@/components/AttendanceTable";
import { api, AttendanceRecord } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";

export default function TeacherDashboard() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAttendanceRecords();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  const todayRecords = records.filter(
    (r) => r.date === new Date().toISOString().split("T")[0]
  );
  const presentToday = todayRecords.filter((r) => r.status === "present").length;
  const absentToday = 5 - presentToday; // Mock total students

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navbar */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 glass border-b border-border"
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Teacher Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      <div className="flex">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{
            width: sidebarOpen ? 256 : 0,
            opacity: sidebarOpen ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
          className="glass border-r border-border overflow-hidden"
        >
          <nav className="p-6 space-y-2">
            <Button variant="default" className="w-full justify-start">
              <Users className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              <UserCheck className="w-4 h-4 mr-2" />
              Students
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start"
              onClick={() => navigate("/reports")}
            >
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </Button>
          </nav>
        </motion.aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {loading ? (
                <>
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                  <Skeleton className="h-32" />
                </>
              ) : (
                <>
                  <StatCard
                    title="Total Students"
                    value={5}
                    icon={Users}
                    trend="Registered students"
                    index={0}
                  />
                  <StatCard
                    title="Present Today"
                    value={presentToday}
                    icon={UserCheck}
                    trend={`${Math.round((presentToday / 5) * 100)}% attendance`}
                    index={1}
                  />
                  <StatCard
                    title="Absent Today"
                    value={absentToday}
                    icon={UserX}
                    trend={`${absentToday} students missing`}
                    index={2}
                  />
                </>
              )}
            </div>

            {/* Attendance Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-2xl font-bold mb-4">Attendance Records</h2>
              {loading ? (
                <Skeleton className="h-96" />
              ) : (
                <AttendanceTable records={records} />
              )}
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
