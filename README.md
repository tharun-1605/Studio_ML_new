# StudioAI: AI-Powered Photo Retrieval System

StudioAI is a modern, high-performance web application designed for event photographers and guests. It automates photo distribution by allowing guests to register with a selfie and instantly retrieve all photos featuring their face from large event galleries.

---

## ✨ Key Features

- **🎯 AI Face Recognition & Vector Search**:
  - Automatically detects faces, extracts 128-dimensional face embeddings using `dlib` (via `face_recognition`).
  - Utilizes Facebook AI Similarity Search (`FAISS`) for high-speed, L2-distance-based face matching.
  - Strict matching thresholds (L2 distance $\le$ 0.22) to prevent false matches.
- **📦 Chunked Resumable Uploads**:
  - Supports large ZIP archive uploads (up to 100 GB) directly to the server.
  - Slices files into manageable chunks (5MB to 50MB) on the client side to bypass Nginx and Cloudflare Tunnel upload limits.
  - Includes an automatic retry mechanism (up to 3 attempts per chunk) and real-time visual progress percentage.
- **🔄 Live Google Drive Syncing**:
  - Background syncing service that periodically pulls and indexes photos from a public Google Drive folder link.
- **💬 Automated WhatsApp Delivery**:
  - Integrates a notification dispatch system to send direct, private matching photo links directly to registered guests' phone numbers.
- **📊 Admin Operations Dashboard**:
  - Manage live or archived event rooms, monitor background ingestion tasks, export registered guest tables to CSV, and track global statistics.
- **🎨 Premium Dark Theme & Glassmorphism**:
  - Responsive user interface styled with Tailwind CSS, Lucide Icons, and smooth animations powered by Framer Motion.

---

## 📂 Project Architecture

```text
├── backend/
│   ├── api/
│   │   └── routes.py         # REST endpoints (events, chunked uploads, auth)
│   ├── models/
│   │   └── database.py       # MongoDB schemas & CRUD operations
│   ├── services/
│   │   ├── drive_sync.py     # Background loop for Google Drive syncing
│   │   ├── face_processor.py # FAISS indexing & face embedding extraction
│   │   └── whatsapp.py       # WhatsApp notification template service
│   ├── main.py               # FastAPI entry point
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile            # Container definition
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx  # Ingestions, uploads, and operations
│   │   │   ├── ClientPortal.jsx    # Guest search, uploads, and selfie matching
│   │   │   └── LoginRegister.jsx   # Credentials and registration
│   │   ├── App.jsx           # Main routing & layout
│   │   └── index.css         # Styling system
│   ├── package.json          # Node dependencies
│   └── Dockerfile            # Frontend web server definition
├── docker-compose.yml        # Multi-container orchestrator
└── nginx.conf                # Reverse proxy configuration
```

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), Tailwind CSS, Axios, Lucide Icons, Framer Motion.
- **Backend**: FastAPI (Python 3.12-slim), Uvicorn.
- **Database**: MongoDB.
- **Machine Learning**: `dlib` / `face_recognition`, `faiss-cpu`, OpenCV (`cv2`), Pillow (`PIL`).

---

## 🚀 Quick Start Deployment (Docker)

Ensure you have **Docker** and **Docker Compose** installed on your server.

### 1. Clone the Repository
```bash
git clone <your-repo-url> Studio_ML
cd Studio_ML
```

### 2. Configure Environment Variables
Open `docker-compose.yml` and adjust the environment variables under the `ml-backend` service:

- `API_PUBLIC_URL`: Set this to your public domain or server IP pointing to the photos API (e.g., `https://ai.zapicture.in/api/photos`).
- `MONGO_URI`: The connection string for your MongoDB database (defaults to the internal `ml-mongodb` container).

### 3. Start the Application
Build and run the containers in detached mode:

```bash
docker compose up -d --build
```

The application will be accessible through port `8080` (mapped via the `ml-nginx` reverse proxy).

---

## 💻 Local Development Setup

If you prefer to run the application locally without Docker:

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install system dependencies:
   * **Ubuntu/Debian**: `sudo apt install build-essential cmake libgl1-mesa-glx libglib2.0-0`
   * **macOS**: `brew install cmake pkg-config`
4. Install Python requirements:
   ```bash
   pip install -r requirements.txt
   ```
5. Run the development server:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev
   ```

---

## 🛡️ License

This project is licensed under the MIT License.
