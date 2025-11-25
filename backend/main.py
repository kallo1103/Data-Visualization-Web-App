from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import aiofiles
import os
import uuid
from tasks import process_file
from celery.result import AsyncResult
from celery_app import celery_app
from database import engine, get_db
import models

# Create database tables if they don't exist
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
    
    try:
        # 1. Save file to disk (local/volume)
        async with aiofiles.open(file_path, 'wb') as out_file:
            while content := await file.read(1024 * 1024):  # 1MB chunks
                await out_file.write(content)
        
        # 2. Create record in Database
        db_file = models.AnalysisResult(
            filename=file.filename,
            file_path=file_path,
            status="PENDING"
        )
        db.add(db_file)
        db.commit()
        db.refresh(db_file)

        # 3. Send task to Celery (include db_id so worker can update)
        task = process_file.delay(file_path, file.filename, db_file.id)
        
        # 4. Update task_id in DB
        db_file.task_id = task.id
        db.commit()
        
        return {
            "task_id": task.id, 
            "filename": file.filename,
            "db_id": db_file.id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{task_id}")
def get_status(task_id: str, db: Session = Depends(get_db)):
    # Prioritize checking DB first
    db_record = db.query(models.AnalysisResult).filter(models.AnalysisResult.task_id == task_id).first()
    
    if db_record and db_record.status == "COMPLETED":
        return {
            "task_id": task_id,
            "status": "SUCCESS",
            "result": db_record.analysis_data
        }
    
    if db_record and db_record.status == "FAILED":
        return {
            "task_id": task_id,
            "status": "FAILURE",
            "error": db_record.error_message
        }

    # Fallback to Celery if DB hasn't updated yet or error
    task_result = AsyncResult(task_id, app=celery_app)
    response = {
        "task_id": task_id,
        "status": task_result.status,
    }
    
    if task_result.status == 'SUCCESS':
        response["result"] = task_result.result
    elif task_result.status == 'FAILURE':
        response["error"] = str(task_result.result)
        
    return response

@app.get("/files")
def list_files(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List uploaded files and processing status from Database"""
    files = db.query(models.AnalysisResult).order_by(models.AnalysisResult.upload_date.desc()).offset(skip).limit(limit).all()
    return files
