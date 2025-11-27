// API Service - Connect to your Python FastAPI backend here

export interface Student {
  id: string;
  name: string;
  studentId: string;
  photo?: string;
  email: string;
  studentRoll?: string;
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

// Token management utilities
export const getAuthToken = () => localStorage.getItem("auth_token");
export const setAuthToken = (token: string) => localStorage.setItem("auth_token", token);
export const removeAuthToken = () => localStorage.removeItem("auth_token");
export const getAuthUser = () => {
  const user = localStorage.getItem("auth_user");
  return user ? JSON.parse(user) : null;
};
export const setAuthUser = (user: any) => localStorage.setItem("auth_user", JSON.stringify(user));
export const removeAuthUser = () => localStorage.removeItem("auth_user");

export const api = {
  // Login endpoint
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
    
    return await response.json();
  },

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
  async getAttendanceRecords(startDate?: string, endDate?: string, roll?: string): Promise<AttendanceRecord[]> {
    const params = new URLSearchParams();
    if (startDate) params.append('from', startDate);
    if (endDate) params.append('to', endDate);
    if (roll) params.append('roll', roll);
    
    const response = await fetch(`${API_BASE_URL}/attendance?${params.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch attendance records');
    }
    
    const data = await response.json();
    
    return data.map((record: any) => ({
      id: record._id || record.id,
      studentId: record.roll,
      studentName: record.name,
      date: new Date(record.timestamp).toISOString().split('T')[0],
      time: new Date(record.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status: record.status?.toLowerCase() || "present",
      method: "face"
    }));
  },

  // Get student statistics
  async getStudentStats(studentId: string): Promise<{ present: number; absent: number; total: number }> {
    const params = new URLSearchParams({ roll: studentId });
    const response = await fetch(`${API_BASE_URL}/attendance?${params.toString()}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch student stats');
    }
    
    const data = await response.json();
    const present = data.length;
    
    return {
      present,
      absent: 0,
      total: present
    };
  },

  // Get list of all students
  async getStudents(): Promise<Student[]> {
    const response = await fetch(`${API_BASE_URL}/students`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch students');
    }
    
    const students = await response.json();
    return students.map((student: any) => ({
      id: student.id,
      name: student.name,
      studentId: student.roll,
      email: student.email,
      photo: student.avatarPath
    }));
  },

  // Create a new student
  async createStudent(data: { name: string; email: string; studentRoll: string; password: string }): Promise<Student> {
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
      throw new Error(error.detail || 'Failed to create student');
    }
    
    const result = await response.json();
    return {
      id: result.user.id,
      name: result.user.name,
      studentId: result.user.studentRoll,
      email: result.user.email,
      photo: result.user.avatarPath
    };
  },

  // Update an existing student
  async updateStudent(id: string, data: { name: string; email: string; studentRoll: string }): Promise<Student> {
    const response = await fetch(`${API_BASE_URL}/students/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        roll: data.studentRoll
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to update student');
    }
    
    const result = await response.json();
    return {
      id: result.id,
      name: result.name,
      studentId: result.roll,
      email: result.email,
      photo: result.avatarPath
    };
  },

  // Delete a student
  async deleteStudent(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/students/${id}`, {
      method: 'DELETE',
      headers: { 
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete student');
    }
  },
};
