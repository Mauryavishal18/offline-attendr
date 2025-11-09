# Backend Integration Guide

This frontend is ready to connect to your Python FastAPI backend. Follow these steps:

## Current Status
✅ Complete React frontend with:
- Beautiful login page (Teacher/Student roles)
- Teacher dashboard with attendance table, stats, and Excel export
- Student dashboard with camera capture and charts
- Dark/Light mode toggle
- Smooth Framer Motion animations
- Glassmorphism design

⏳ Mock data currently used - ready for backend connection

## Connecting Your FastAPI Backend

### 1. Update API Base URL
Edit `src/services/api.ts` and update the `API_BASE_URL`:

```typescript
const API_BASE_URL = "http://127.0.0.1:8000";
```

### 2. Uncomment API Calls
In `src/services/api.ts`, replace the mock implementations with actual fetch calls. The commented code is already there:

```typescript
// Example for registerStudent:
async registerStudent(data: Omit<Student, "id">): Promise<Student> {
  const response = await fetch(`${API_BASE_URL}/register_student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return response.json();
}
```

### 3. Backend CORS Configuration
Make sure your FastAPI backend has CORS enabled:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 4. Expected API Endpoints

Your FastAPI backend should implement these endpoints:

#### POST /register_student
- Body: `{ name, studentId, email, photo? }`
- Returns: Student object with generated ID

#### POST /mark_attendance
- Body: FormData with image file
- Returns: AttendanceRecord object

#### GET /attendance_records
- Returns: Array of AttendanceRecord objects

#### GET /students
- Returns: Array of Student objects

#### GET /student_stats/{studentId}
- Returns: `{ present: number, absent: number, total: number }`

## Running the Project

### Frontend (This React App)
```bash
npm install
npm run dev
```
Opens at: http://localhost:5173

### Backend (Your Python FastAPI)
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs at: http://127.0.0.1:8000

## Features Implemented

### Teacher Dashboard
- 📊 Real-time attendance statistics
- 📋 Searchable and sortable attendance table
- 📥 Export to Excel functionality
- 🎨 Animated cards and smooth transitions
- 📱 Fully responsive design

### Student Dashboard
- 📸 Camera capture for face recognition
- 📊 Attendance charts (Pie + Bar)
- 📈 Progress tracking with percentage
- 🎯 Personal attendance statistics

### Design Features
- 🌓 Dark/Light mode with smooth transitions
- ✨ Framer Motion animations throughout
- 💎 Glassmorphism effects
- 🎨 Beautiful gradients and shadows
- 📱 Mobile-responsive layout

## Demo Credentials
Currently accepts any username/password for testing. Implement actual authentication in your backend.

## Next Steps
1. Build your Python FastAPI backend
2. Update the API calls in `src/services/api.ts`
3. Test the integration
4. Add authentication with JWT tokens
5. Implement face recognition with OpenCV

---

**Note**: This is a production-ready frontend. The UI/UX is complete and polished. Simply connect your backend to make it fully functional!
