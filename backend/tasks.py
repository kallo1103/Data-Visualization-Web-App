import pandas as pd
import os
from celery_app import celery_app
import json
import numpy as np
from database import SessionLocal
from models import AnalysisResult

import math

# Helper to clean NaNs for JSON serialization
def clean_nans(obj):
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
    elif isinstance(obj, dict):
        return {k: clean_nans(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [clean_nans(v) for v in obj]
    return obj

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@celery_app.task(bind=True)
def process_file(self, file_path: str, original_filename: str, db_id: int = None):
    # Update status to processing
    db = None
    record = None
    if db_id:
        db = SessionLocal()
        try:
            record = db.query(AnalysisResult).filter(AnalysisResult.id == db_id).first()
            if record:
                record.status = "PROCESSING"
                db.commit()
        except Exception as e:
            print(f"Error connecting to DB: {e}")

    try:
        # Let exceptions propagate so Celery marks task as FAILURE
        file_ext = os.path.splitext(original_filename)[1].lower()
        
        if file_ext == '.csv':
            try:
                df = pd.read_csv(file_path)
            except UnicodeDecodeError:
                df = pd.read_csv(file_path, encoding='latin1')
        elif file_ext in ['.xls', '.xlsx']:
            df = pd.read_excel(file_path)
        elif file_ext == '.json':
            df = pd.read_json(file_path)
        elif file_ext == '.parquet':
            df = pd.read_parquet(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")

        # Clean up NaN/Infinity values which break JSON
        df = df.replace([np.inf, -np.inf], np.nan)
        # Note: to_json handles NaN as null automatically, which is valid JSON
        
        # Basic Stats
        description = df.describe().to_json()
        columns = df.columns.tolist()
        dtypes = df.dtypes.astype(str).to_dict()
        
        # Extended Stats for Charts
        extended_stats = {
            "categorical": {},
            "numerical": {}
        }
        
        # Process Categorical Columns for Pie/Bar Charts
        # Identify categorical columns (object or category dtype)
        cat_cols = df.select_dtypes(include=['object', 'category']).columns
        for col in cat_cols:
            # Get top 10 most frequent values
            counts = df[col].value_counts().head(10)
            extended_stats["categorical"][col] = {
                "labels": counts.index.tolist(),
                "values": counts.values.tolist()
            }
            
        # Process Numerical Columns for Histograms
        # Identify numeric columns
        num_cols = df.select_dtypes(include=['number']).columns
        for col in num_cols:
            # Skip if all NaN
            if df[col].isna().all():
                continue
                
            # Calculate histogram
            try:
                # Drop NaN for histogram calculation
                valid_data = df[col].dropna()
                if len(valid_data) > 0:
                    hist, bin_edges = np.histogram(valid_data, bins=10)
                    extended_stats["numerical"][col] = {
                        "hist": hist.tolist(),
                        "bin_edges": bin_edges.tolist()
                    }
            except Exception as e:
                print(f"Error calculating histogram for {col}: {e}")

        head = df.head(50).to_json(orient='records')
        
        result = {
            "filename": original_filename,
            "columns": columns,
            "dtypes": dtypes,
            "description": json.loads(description),
            "extended_stats": clean_nans(extended_stats),
            "preview": json.loads(head),
            "rows": len(df),
            "cols": len(columns)
        }
        
        # Update DB with success result
        if db and record:
            try:
                record.status = "COMPLETED"
                record.analysis_data = result
                # Update file size if possible
                try:
                    record.file_size = os.path.getsize(file_path)
                except:
                    pass
                db.commit()
            except Exception as e:
                print(f"Error saving result to DB: {e}")

        return {"data": result}

    except Exception as e:
        # Update DB with failure
        if db and record:
            try:
                record.status = "FAILED"
                record.error_message = str(e)
                db.commit()
            except:
                pass
        raise e
    finally:
        if db:
            db.close()
