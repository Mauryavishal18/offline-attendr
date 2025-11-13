# Smart Attendance Backend (FastAPI)

Python FastAPI backend for the Smart Attendance System.

## Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Install & Start MongoDB:**
   ```bash
   # On Ubuntu/Debian
   sudo apt install mongodb
   sudo systemctl start mongodb
   
   # On macOS (with Homebrew)
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb-community
   
   # On Windows
   # Download and install from: https://www.mongodb.com/try/download/community
   ```

3. **Seed the database with students:**
   ```bash
   python seed.py
   ```
   
   This creates:
   - 5 students with roll numbers 2301640130144, 2301640130143, 2301640130145, 2301640130085, 2301640130099
   - All student passwords: `123456`
   - 1 teacher account: `teacher@school.com` / `teacher123`

4. **Start the FastAPI server:**
   ```bash
   python main.py
   ```
   
   Or with auto-reload:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

5. **API will be available at:**
   - API: http://127.0.0.1:8000
   - Docs: http://127.0.0.1:8000/docs (interactive Swagger UI)

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Students
- `GET /students` - Get all students

### Attendance
- `POST /attendance` - Mark attendance (body: `{roll, name}`)
- `GET /attendance?from=YYYY-MM-DD&to=YYYY-MM-DD&roll=...` - Get attendance records

## Database

- **Database name:** `lovable_attendance_db`
- **Collections:**
  - `users` - Student and teacher accounts
  - `attendance` - Attendance records

## Notes

- No image upload required - attendance marked by roll number only
- Duplicate attendance check: prevents marking twice in same day
- Returns 409 status if already marked today
- CORS enabled for frontend (localhost:8080, localhost:5173)
