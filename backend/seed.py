import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

MONGO_URL = "mongodb://127.0.0.1:27017"
DATABASE_NAME = "lovable_attendance_db"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_database():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DATABASE_NAME]
    
    # Clear existing data
    await db.users.delete_many({})
    await db.attendance.delete_many({})
    
    print("Seeding database with students...")
    
    # Exact students as requested
    students = [
        {
            "studentRoll": "2301640130144",
            "name": "Vishal Maurya",
            "email": "vishal@gmail.com",
            "password": hash_password("123456"),
            "role": "student"
        },
        {
            "studentRoll": "2301640130143",
            "name": "Virat Trivedi",
            "email": "virat@gmail.com",
            "password": hash_password("123456"),
            "role": "student"
        },
        {
            "studentRoll": "2301640130145",
            "name": "Vishesh Singh",
            "email": "vishesh@gmail.com",
            "password": hash_password("123456"),
            "role": "student"
        },
        {
            "studentRoll": "2301640130085",
            "name": "Parth Mishra",
            "email": "parth@gmail.com",
            "password": hash_password("123456"),
            "role": "student"
        },
        {
            "studentRoll": "2301640130099",
            "name": "Ram Ji",
            "email": "ram@gmail.com",
            "password": hash_password("123456"),
            "role": "student"
        }
    ]
    
    # Insert students
    result = await db.users.insert_many(students)
    print(f"✓ Inserted {len(result.inserted_ids)} students")
    
    # Add default teacher account
    teacher = {
        "name": "Teacher Admin",
        "email": "teacher@school.com",
        "password": hash_password("teacher123"),
        "role": "teacher"
    }
    await db.users.insert_one(teacher)
    print("✓ Added default teacher account (teacher@school.com / teacher123)")
    
    print("\n✅ Database seeded successfully!")
    print("\nStudent accounts:")
    for s in students:
        print(f"  • {s['studentRoll']} - {s['name']} ({s['email']}) - password: 123456")
    print(f"\nTeacher account:")
    print(f"  • teacher@school.com - password: teacher123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
