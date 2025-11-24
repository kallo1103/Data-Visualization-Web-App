from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import aiofiles
import os
import uuid
from tasks import process_file
from celery.result import AsyncResult
from celery_app import celery_app

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1]
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_ext}")
    
    try:
        # Use aiofiles for non-blocking I/O
        async with aiofiles.open(file_path, 'wb') as out_file:
            # Read in chunks to avoid memory issues with large files
            while content := await file.read(1024 * 1024):  # 1MB chunks
                await out_file.write(content)
            
        task = process_file.delay(file_path, file.filename)
        
        return {"task_id": task.id, "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/status/{task_id}")
def get_status(task_id: str):
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
