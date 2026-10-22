from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select1, text1
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas import UserOut

app = FastAPI()

# allow the React dev server to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Backend is running"}


@app.get("/db-check")
def db_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"database": "connected"}


# response_model filters the output through UserOut (no hashed_password)
@app.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.scalars(select(User).order_by(User.id)).all()
