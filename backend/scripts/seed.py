from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Base
from app.models.enums import UserRole
from app.models.user import User
from app.db.session import engine


def upsert_user(db, email, full_name, role, department=None):
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        return existing
    user = User(
        email=email,
        full_name=full_name,
        role=role,
        department=department,
        hashed_password=hash_password("Password123!"),
        is_verified=True,
        is_active=True,
    )
    db.add(user)
    db.commit()
    return user


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        upsert_user(db, "student1@pau.edu.ng", "Student One", UserRole.student)
        upsert_user(db, "academic.cs@pau.edu.ng", "Academic CS", UserRole.academic_staff, "Computer Science")
        upsert_user(db, "head.cs@pau.edu.ng", "Head CS", UserRole.department_head, "Computer Science")
        upsert_user(db, "affairs@pau.edu.ng", "Student Affairs", UserRole.student_affairs)
        upsert_user(db, "facilities@pau.edu.ng", "Facilities Team", UserRole.facilities_management)
        upsert_user(db, "management@pau.edu.ng", "University Management", UserRole.university_management)
        upsert_user(db, "admin@pau.edu.ng", "ICT Admin", UserRole.ict_admin)
        print("Seed completed. Default password: Password123!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
