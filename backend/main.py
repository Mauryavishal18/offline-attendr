from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from datetime import datetime, date, time
from typing import Optional, List
import bcrypt
import jwt
from bson import ObjectId

app = FastAPI(title="Smart Attendance API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = "mongodb://127.0.0.1:27017"
DATABASE_NAME = "lovable_attendance_db"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DATABASE_NAME]

# JWT Secret (change this in production!)
JWT_SECRET = "your-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"

# Pydantic Models
class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str
    studentRoll: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class AttendanceRequest(BaseModel):
    roll: str
    name: str

class AttendanceResponse(BaseModel):
    studentId: str
    roll: str
    name: str
    timestamp: datetime
    status: str

# Helper functions
def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow().timestamp() + 86400  # 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# Routes
@app.post("/auth/register")
async def register(payload: RegisterRequest):
    # Check if user exists
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password": hash_password(payload.password),
        "role": payload.role,
        "createdAt": datetime.utcnow()
    }
    
    if payload.studentRoll:
        user_doc["studentRoll"] = payload.studentRoll
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    token = create_token(user_id, payload.email, payload.role)
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": payload.name,
            "email": payload.email,
            "role": payload.role,
            "studentRoll": payload.studentRoll
        }
    }

@app.post("/auth/login")
async def login(payload: LoginRequest):
    user = await db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    token = create_token(user_id, user["email"], user["role"])
    
    return {
        "token": token,
        "user": {
            "id": user_id,
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "studentRoll": user.get("studentRoll")
        }
    }

@app.get("/students")
async def get_students():
    students = await db.users.find({"role": "student"}).to_list(100)
    return [
        {
            "id": str(s["_id"]),
            "roll": s.get("studentRoll", ""),
            "name": s["name"],
            "email": s["email"],
            "avatarPath": s.get("avatarPath")
        }
        for s in students
    ]

@app.post("/attendance")
async def mark_attendance(payload: AttendanceRequest):
    # Find student by roll number
    student = await db.users.find_one({"studentRoll": payload.roll, "role": "student"})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Check if already marked today
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, time.min)
    end_of_day = datetime.combine(today, time.max)
    
    existing = await db.attendance.find_one({
        "studentId": str(student["_id"]),
        "timestamp": {"$gte": start_of_day, "$lt": end_of_day}
    })
    
    if existing:
        return {
            "message": "Already marked today",
            "attendance": {
                "studentId": existing["studentId"],
                "roll": existing["roll"],
                "name": existing["name"],
                "timestamp": existing["timestamp"].isoformat(),
                "status": existing["status"]
            }
        }
    
    # Create new attendance record
    attendance_doc = {
        "studentId": str(student["_id"]),
        "roll": payload.roll,
        "name": payload.name,
        "timestamp": datetime.utcnow(),
        "status": "Present"
    }
    
    result = await db.attendance.insert_one(attendance_doc)
    attendance_doc["_id"] = str(result.inserted_id)
    
    return {
        "message": "Attendance marked",
        "attendance": {
            "studentId": attendance_doc["studentId"],
            "roll": attendance_doc["roll"],
            "name": attendance_doc["name"],
            "timestamp": attendance_doc["timestamp"].isoformat(),
            "status": attendance_doc["status"]
        }
    }

@app.get("/attendance")
async def get_attendance(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    roll: Optional[str] = None
):
    query = {}
    
    if roll:
        query["roll"] = roll
    
    if from_date or to_date:
        query["timestamp"] = {}
        if from_date:
            query["timestamp"]["$gte"] = datetime.fromisoformat(from_date)
        if to_date:
            query["timestamp"]["$lt"] = datetime.fromisoformat(to_date)
    
    records = await db.attendance.find(query).sort("timestamp", -1).to_list(1000)
    
    return [
        {
            "id": str(r["_id"]),
            "studentId": r["studentId"],
            "roll": r["roll"],
            "name": r["name"],
            "timestamp": r["timestamp"].isoformat(),
            "status": r["status"]
        }
        for r in records
    ]

@app.get("/")
async def root():
    return {"message": "Smart Attendance API", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
