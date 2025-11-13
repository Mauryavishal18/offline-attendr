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

// API Base URL - Update this to your FastAPI backend URL
const API_BASE_URL = "http://127.0.0.1:8000";

// Mock API calls - Replace with actual fetch calls to your backend
export const api = {
  // Register a new student
  async registerStudent(data: Omit<Student, "id">): Promise<Student> {
    // TODO: Replace with actual API call
    // const response = await fetch(`${API_BASE_URL}/register_student`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });
    // return response.json();
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ ...data, id: Date.now().toString() });
      }, 1000);
    });
  },

  // Mark attendance with image upload
  async markAttendance(imageFile: File): Promise<AttendanceRecord> {
    // TODO: Replace with actual API call
    // const formData = new FormData();
    // formData.append('image', imageFile);
    // const response = await fetch(`${API_BASE_URL}/mark_attendance`, {
    //   method: 'POST',
    //   body: formData
    // });
    // return response.json();
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const randomStudent = mockStudents[Math.floor(Math.random() * mockStudents.length)];
        resolve({
          id: Date.now().toString(),
          studentId: randomStudent.studentId,
          studentName: randomStudent.name,
          date: new Date().toISOString().split('T')[0],
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          status: "present",
          method: "face"
        });
      }, 1500);
    });
  },

  // Get all attendance records
  async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    // TODO: Replace with actual API call
    // const response = await fetch(`${API_BASE_URL}/attendance_records`);
    // return response.json();
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockAttendance);
      }, 500);
    });
  },

  // Get student attendance stats
  async getStudentStats(studentId: string): Promise<{ present: number; absent: number; total: number }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const records = mockAttendance.filter(r => r.studentId === studentId);
        const present = records.filter(r => r.status === "present").length;
        resolve({
          present,
          absent: 2,
          total: present + 2
        });
      }, 500);
    });
  },

  // Get all students
  async getStudents(): Promise<Student[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockStudents);
      }, 500);
    });
  }
};
