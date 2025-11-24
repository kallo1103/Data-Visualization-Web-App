# 📊 Data Visualization Web App

A modern web application for uploading, analyzing, and visualizing data with a beautiful interface and high performance. The system supports asynchronous processing of large data files and automatically generates interactive charts based on statistical analysis.

## 🎯 Overview

This project is a comprehensive data analysis platform that allows users to:
- Upload data files in multiple formats (CSV, Excel, JSON, Parquet)
- Automatically analyze and compute descriptive statistics
- Visualize data with interactive charts (zoom, pan, hover tooltips)
- View data preview and metadata instantly

## 🏗️ System Architecture

### Microservices Architecture with Docker

```
┌─────────────┐
│  Frontend   │  Next.js 14 (React 19)
│  Port: 3000 │  TypeScript + Tailwind CSS
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────┐
│   Backend   │  FastAPI (Python 3.11)
│  Port: 8000 │  RESTful API
└──────┬──────┘
       │
       ├──► Redis (Message Broker)
       │    Port: 6379
       │
       ├──► Celery Worker (Background Processing)
       │    Pandas Data Analysis
       │
       └──► PostgreSQL (Database)
            Port: 5433
```

### Data Processing Flow

1. **Upload**: User uploads file via Frontend → Backend API
2. **Queue**: Backend enqueues task to Redis queue (Celery)
3. **Processing**: Celery Worker reads file, analyzes with Pandas
4. **Storage**: Stores metadata and analysis results
5. **Visualization**: Frontend displays charts and data tables

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: 
  - Shadcn UI (Radix Primitives)
  - Tailwind CSS 3.x
  - Framer Motion (Animations)
- **Visualization**: Apache ECharts (echarts-for-react)
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI
- **Language**: Python 3.11
- **Data Processing**: Pandas
- **Task Queue**: Celery + Redis
- **Database**: PostgreSQL 15
- **File Formats**: 
  - CSV (pandas)
  - Excel (openpyxl)
  - JSON (pandas)
  - Parquet (pyarrow)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7

## ✨ Key Features

### 1. Multi-Format File Upload
- ✅ Supports: CSV, Excel (.xlsx, .xls), JSON, Parquet
- ✅ Drag & Drop interface with smooth animations
- ✅ Upload progress tracking
- ✅ File validation and error handling

### 2. Asynchronous Processing
- ✅ Celery task queue for handling large files without blocking
- ✅ Real-time status polling
- ✅ Background processing with Redis broker

### 3. Automatic Data Analysis
- ✅ Automatic file format detection
- ✅ Computes descriptive statistics (mean, min, max, std, etc.)
- ✅ Data type detection
- ✅ Preview first 10 rows

### 4. Interactive Visualization
- ✅ Auto-generated charts based on metadata (Auto-Suggestion)
- ✅ ECharts with full features:
  - Zoom & Pan
  - Hover tooltips
  - Legend filtering
  - Responsive design
- ✅ Data preview table

### 5. Modern UI/UX
- ✅ Collapsible sidebar with animations
- ✅ Dark/Light mode support (CSS variables)
- ✅ Responsive design (mobile-friendly)
- ✅ Smooth transitions with Framer Motion

## 📁 Project Structure

```
Data Visualization Web App/
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   │   ├── page.tsx      # Dashboard home
│   │   │   ├── upload/        # Upload page
│   │   │   └── analytics/    # Analytics visualization
│   │   ├── components/        # React components
│   │   │   ├── ui/           # Shadcn UI components
│   │   │   ├── UploadZone.tsx
│   │   │   ├── ChartWidget.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── DashboardLayout.tsx
│   │   └── lib/              # Utilities
│   │       └── utils.ts
│   ├── Dockerfile
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend/
│   ├── main.py               # FastAPI application
│   ├── tasks.py              # Celery tasks (data processing)
│   ├── celery_app.py         # Celery configuration
│   ├── requirements.txt
│   ├── Dockerfile
│   └── uploads/              # Uploaded files storage
│
├── docker-compose.yml        # Orchestration
└── README.md
```

## 🚀 Installation

### System Requirements

- Docker Desktop (or Docker Engine + Docker Compose)
- Node.js 20+ (if running frontend locally)
- Python 3.11+ (if running backend locally)

### Installation with Docker (Recommended)

1. **Clone repository** (if applicable) or ensure you have all files

2. **Start Docker Desktop**

3. **Build and start services:**

```bash
docker-compose up --build
```

This command will:
- Build images for frontend, backend, and worker
- Pull images for PostgreSQL and Redis
- Create network and volumes
- Start all services

4. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API Docs: http://localhost:8000/docs
   - Backend API: http://localhost:8000

### Running in Development Mode (Local)

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Backend

```bash
cd backend
pip install -r requirements.txt

# Terminal 1: Start FastAPI server
uvicorn main:app --reload

# Terminal 2: Start Celery worker
celery -A celery_app worker --loglevel=info
```

**Note**: Requires Redis and PostgreSQL to be running.

## 📖 Usage Guide

### 1. Upload File

1. Navigate to http://localhost:3000/upload
2. Drag and drop file or click to select file
3. Supported formats: `.csv`, `.xlsx`, `.xls`, `.json`, `.parquet`
4. Click "Upload & Analyze"
5. Wait for system processing (status can be tracked)

### 2. View Analytics

1. After successful upload, click "View Analysis"
2. Analytics page will display:
   - Auto-generated charts based on numeric data
   - Preview table with first 10 rows
   - Metadata information (row count, column count, data types)

### 3. Interact with Charts

- **Zoom**: Scroll mouse to zoom in/out
- **Pan**: Click and drag to move
- **Tooltip**: Hover over data points to see detailed values
- **Legend**: Click legend items to show/hide series

## 🔌 API Documentation

### Endpoints

#### `POST /upload`
Upload file for processing.

**Request:**
- Content-Type: `multipart/form-data`
- Body: File (form field: `file`)

**Response:**
```json
{
  "task_id": "uuid-string",
  "filename": "data.csv"
}
```

#### `GET /status/{task_id}`
Check processing status of a task.

**Response:**
```json
{
  "task_id": "uuid-string",
  "status": "SUCCESS" | "PENDING" | "PROCESSING" | "FAILURE",
  "result": {
    "status": "success",
    "data": {
      "filename": "data.csv",
      "columns": ["col1", "col2", ...],
      "dtypes": {"col1": "int64", ...},
      "description": {...},
      "preview": [...],
      "rows": 1000,
      "cols": 5
    }
  }
}
```

#### `GET /`
Health check endpoint.

**Response:**
```json
{
  "Hello": "World"
}
```

View detailed documentation at: http://localhost:8000/docs (Swagger UI)

## 🎨 Highlighted Features

### 1. Auto-Chart Suggestion
System automatically analyzes data and suggests appropriate chart types:
- Numeric data → Bar chart (average values)
- Time-series → Line chart (can be extended)
- Categorical → Pie/Bar chart (can be extended)

### 2. High-Performance Processing
- Asynchronous processing with Celery
- Non-blocking UI when processing large files
- Scalable architecture (can add multiple workers)

### 3. Modern UI/UX
- Smooth animations with Framer Motion
- Responsive design
- Accessible components (Radix UI)
- Dark mode ready (CSS variables)

## 🔮 Roadmap & Future Features

### Phase 2 (Expandable)
- [ ] Custom Dashboard Builder (Drag & Drop charts)
- [ ] Export PDF/Image reports
- [ ] Share dashboard via URL (public/private links)
- [ ] Advanced chart types (Scatter, Heatmap, etc.)
- [ ] Data filtering and aggregation
- [ ] User authentication & data persistence

### Phase 3 (Advanced)
- [ ] Big Data visualization (sampling techniques)
- [ ] WebAssembly (WASM) for client-side calculations
- [ ] LLM Integration (Natural language queries)
- [ ] Real-time data streaming
- [ ] Machine Learning insights

## 🐛 Troubleshooting

### Error: "Cannot connect to Docker daemon"
**Solution**: Ensure Docker Desktop is running.

### Error: "Port already in use"
**Solution**: 
- PostgreSQL: Already changed to port 5433 in docker-compose.yml
- If still conflicting, modify port in docker-compose.yml

### Error: "Build failed - Tailwind CSS"
**Solution**: Fixed by downgrading to Tailwind CSS v3 and proper configuration.

### File upload timeout
**Solution**: File too large, need to increase timeout in nginx/proxy or optimize processing.

## 📝 Environment Variables

### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend
```env
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
DATABASE_URL=postgresql://user:password@db/datavis
```

## 📄 License

MIT License - Free to use for personal and commercial purposes.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

If you have questions or suggestions, please create an issue on the repository.

---

**Built with ❤️ using Next.js, FastAPI, and modern web technologies.**
