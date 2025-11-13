// API Service - Connect to your Python FastAPI backend here
// Currently using mock data for frontend development

export interface Student {
  id: string;
  name: string;
  studentId: string;
  photo?: string;
  email: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  time: string;
  status: "present" | "absent";
  method: "face" | "fingerprint" | "manual";
}

// Mock data - Exact students as per requirements
const mockStudents: Student[] = [
  { id: "1", name: "Vishal Maurya", studentId: "2301640130144", email: "vishal@gmail.com" },
  { id: "2", name: "Virat Trivedi", studentId: "2301640130143", email: "virat@gmail.com" },
  { id: "3", name: "Vishesh Singh", studentId: "2301640130145", email: "vishesh@gmail.com" },
  { id: "4", name: "Parth Mishra", studentId: "2301640130085", email: "parth@gmail.com" },
  { id: "5", name: "Ram Ji", studentId: "2301640130099", email: "ram@gmail.com" },
];

const mockAttendance: AttendanceRecord[] = [
  { id: "1", studentId: "2301640130144", studentName: "Vishal Maurya", date: "2025-11-09", time: "09:15", status: "present", method: "face" },
  { id: "2", studentId: "2301640130143", studentName: "Virat Trivedi", date: "2025-11-09", time: "09:18", status: "present", method: "face" },
  { id: "3", studentId: "2301640130145", studentName: "Vishesh Singh", date: "2025-11-09", time: "09:22", status: "present", method: "face" },
  { id: "4", studentId: "2301640130085", studentName: "Parth Mishra", date: "2025-11-08", time: "09:10", status: "present", method: "face" },
  { id: "5", studentId: "2301640130099", studentName: "Ram Ji", date: "2025-11-08", time: "09:25", status: "present", method: "face" },
];

// API Base URL - FastAPI backend
const API_BASE_URL = "http://127.0.0.1:8000";

// Mock API calls - Replace with actual fetch calls to your backend
export const api = {
  // Register a new student
  async registerStudent(data: Omit<Student, "id"> & { password: string; studentRoll: string }): Promise<{ token: string; user: Student }> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'student',
        studentRoll: data.studentRoll
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }
    
    const result = await response.json();
    return {
      token: result.token,
      user: {
        id: result.user.id,
        name: result.user.name,
        studentId: result.user.studentRoll,
        email: result.user.email,
        photo: result.user.avatarPath
      }
    };
  },

  // Mark attendance by roll number (no image required)
  async markAttendance(roll: string, name: string): Promise<AttendanceRecord> {
    const response = await fetch(`${API_BASE_URL}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roll, name })
    });
    
    if (response.status === 409) {
      const data = await response.json();
      throw new Error(data.message || 'Attendance already marked today');
    }
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to mark attendance');
    }
    
    const result = await response.json();
    const attendance = result.attendance;
    
    return {
      id: attendance.studentId,
      studentId: roll,
      studentName: name,
      date: new Date(attendance.timestamp).toISOString().split('T')[0],
      time: new Date(attendance.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: "present",
      method: "manual"
    };
  },

  // Get all attendance records
  async getAttendanceRecords(fromDate?: string, toDate?: string, roll?: string): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (fromDate) params.append('from_date', fromDate);
    if (toDate) params.append('to_date', toDate);
    if (roll) params.append('roll', roll);
    
    const url = `${API_BASE_URL}/attendance${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch attendance records');
    }
    
    const data = await response.json();
    
    return data.map((record: any) => ({
      id: record.id,
      studentId: record.roll,
      studentName: record.name,
      date: new Date(record.timestamp).toISOString().split('T')[0],
      time: new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: record.status.toLowerCase(),
      method: "manual"
    }));
  },

  // Get student attendance stats
  async getStudentStats(studentRoll: string): Promise<{ present: number; absent: number; total: number }> {
    const allRecords = await this.getAttendanceRecords(undefined, undefined, studentRoll);
    const present = allRecords.filter(r => r.status === "present").length;
    
    // For absent days, calculate days since start of month minus present days
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const daysSinceStart = Math.floor((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const absent = Math.max(0, daysSinceStart - present);
    
    return {
      present,
      absent,
      total: present + absent
    };
  },

  // Get all students
  async getStudents(): Promise<Student[]> {
    const response = await fetch(`${API_BASE_URL}/students`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch students');
    }
    
    const data = await response.json();
    
    return data.map((student: any) => ({
      id: student.id,
      name: student.name,
      studentId: student.roll,
      email: student.email,
      photo: student.avatarPath
    }));
  },

  // Login user
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    
    return response.json();
  }
};
