import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LogOut, Download, Calendar, TrendingUp, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, AttendanceRecord } from "@/services/api";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StudentReport {
  roll: string;
  name: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

export default function Reports() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  // Filter records by date range
  const filteredRecords = records.filter((record) => {
    if (startDate && record.date < startDate) return false;
    if (endDate && record.date > endDate) return false;
    return true;
  });

  // Calculate student-wise reports
  const studentReports: StudentReport[] = (() => {
    const studentMap = new Map<string, StudentReport>();

    filteredRecords.forEach((record) => {
      const key = record.studentId;
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          roll: record.studentId,
          name: record.studentName,
          present: 0,
          absent: 0,
          total: 0,
          percentage: 0,
        });
      }

      const student = studentMap.get(key)!;
      student.total += 1;
      if (record.status === "present") {
        student.present += 1;
      } else {
        student.absent += 1;
      }
      student.percentage = Math.round((student.present / student.total) * 100);
    });

    return Array.from(studentMap.values()).sort((a, b) => b.percentage - a.percentage);
  })();

  // Overall stats
  const totalPresent = filteredRecords.filter((r) => r.status === "present").length;
  const totalAbsent = filteredRecords.filter((r) => r.status === "absent").length;
  const overallPercentage = filteredRecords.length > 0 
    ? Math.round((totalPresent / filteredRecords.length) * 100) 
    : 0;

  // Chart data
  const chartData = studentReports.map((s) => ({
    name: s.name,
    present: s.present,
    absent: s.absent,
    percentage: s.percentage,
  }));

  const pieData = [
    { name: "Present", value: totalPresent, color: "hsl(var(--success))" },
    { name: "Absent", value: totalAbsent, color: "hsl(var(--destructive))" },
  ];

  const exportToPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text("Attendance Report", 14, 20);

    // Date range
    doc.setFontSize(11);
    doc.text(
      `Period: ${startDate || "All"} to ${endDate || "All"}`,
      14,
      30
    );

    // Summary
    doc.text(`Overall Attendance: ${overallPercentage}%`, 14, 40);
    doc.text(`Total Present: ${totalPresent}`, 14, 47);
    doc.text(`Total Absent: ${totalAbsent}`, 14, 54);

    // Student-wise table
    autoTable(doc, {
      startY: 65,
      head: [["Roll No", "Name", "Present", "Absent", "Total", "Percentage"]],
      body: studentReports.map((s) => [
        s.roll,
        s.name,
        s.present,
        s.absent,
        s.total,
        `${s.percentage}%`,
      ]),
    });

    doc.save("attendance-report.pdf");

    toast({
      title: "PDF Downloaded",
      description: "Attendance report has been exported to PDF.",
    });
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      studentReports.map((s) => ({
        "Roll No": s.roll,
        Name: s.name,
        Present: s.present,
        Absent: s.absent,
        Total: s.total,
        "Percentage": `${s.percentage}%`,
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");

    XLSX.writeFile(workbook, "attendance-report.xlsx");

    toast({
      title: "Excel Downloaded",
      description: "Attendance report has been exported to Excel.",
    });
  };

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
              onClick={() => navigate("/teacher")}
            >
              ← Back to Dashboard
            </Button>
            <h1 className="text-xl font-bold">Attendance Reports</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto p-6 max-w-7xl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-6"
        >
          {/* Filters and Export */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Filters & Export
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="start-date">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="end-date">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={exportToPDF} className="flex-1">
                    <FileText className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button onClick={exportToExcel} variant="secondary" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-48" />
              <Skeleton className="h-96" />
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Overall Attendance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{overallPercentage}%</div>
                    <p className="text-sm text-muted-foreground">
                      {filteredRecords.length} total records
                    </p>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Present</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-success">{totalPresent}</div>
                    <p className="text-sm text-muted-foreground">Students marked present</p>
                  </CardContent>
                </Card>

                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Absent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-destructive">{totalAbsent}</div>
                    <p className="text-sm text-muted-foreground">Students marked absent</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Student-wise Attendance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" fill="hsl(var(--success))" name="Present" />
                        <Bar dataKey="absent" fill="hsl(var(--destructive))" name="Absent" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Pie Chart */}
                <Card className="glass-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Overall Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Student Reports Table */}
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Student-wise Attendance Percentage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left p-3">Roll No</th>
                          <th className="text-left p-3">Name</th>
                          <th className="text-center p-3">Present</th>
                          <th className="text-center p-3">Absent</th>
                          <th className="text-center p-3">Total</th>
                          <th className="text-center p-3">Percentage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentReports.map((student) => (
                          <tr key={student.roll} className="border-b border-border/50">
                            <td className="p-3">{student.roll}</td>
                            <td className="p-3">{student.name}</td>
                            <td className="text-center p-3 text-success font-semibold">
                              {student.present}
                            </td>
                            <td className="text-center p-3 text-destructive font-semibold">
                              {student.absent}
                            </td>
                            <td className="text-center p-3">{student.total}</td>
                            <td className="text-center p-3">
                              <span
                                className={`font-bold ${
                                  student.percentage >= 75
                                    ? "text-success"
                                    : student.percentage >= 50
                                    ? "text-warning"
                                    : "text-destructive"
                                }`}
                              >
                                {student.percentage}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}
