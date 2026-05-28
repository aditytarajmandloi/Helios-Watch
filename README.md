# 🌌 HeliosWatch: Real-Time Space Weather Telemetry & Cinematic Educational Platform

**HeliosWatch** is a state-of-the-art web application developed to bridge the critical gap between complex space physics telemetry and public accessibility. By aggregating raw, live data streams from deep-space NASA and NOAA satellites, it transforms disparate scientific data into a cinematic, highly responsive, and educational mission control interface.

---

## 🚀 Key Features

*   **🎬 Cinematic Scrollytelling Landing Page**: Uses a custom-engineered HTML5 canvas rendering engine to stream 225 high-resolution pre-loaded frames at a locked 60 FPS, tied to user scroll percent, augmented by GreenSock (GSAP) inverse mouse parallax for a true 3D depth transition.
*   **🔐 Glassmorphic Authentication**: Fully secure JWT-based authentication gateway and OTP-based password recovery overlaying the cinematic background.
*   **📊 Adaptive Dual-Mode Dashboard**:
    *   *Beginner Mode*: Renders simplified charts, friendly explanations, and plain-English tooltips describing each metric.
    *   *Expert Mode*: Displays high-density telemetry grids, rolling averages, standard deviations, min/max historical values, trend indicators, multi-metric correlation charts, and derived parameters (e.g., the $V \cdot B^2$ solar-magnetosphere coupling energy).
*   **🎓 Mission Academy (Interactive Education)**: Sleek educational modules where theoretical content is dynamically driven by the live WebSocket data. Badge readouts pulse with real-time solar wind speeds and X-ray classifications.
*   **⚙️ Autonomous Ingestion Daemon**: A Node.js background worker polls NOAA and NASA (DONKI) REST APIs, normalizes disparate formats, interpolates missing values, and writes a unified cache.
*   **⚡ Native WebSocket Streamer**: A zero-latency, 1Hz WebSocket broadcast layer pushing aligned space weather metrics instantly to all connected clients.
*   **🤖 Daily AI Meteorological Reports**: An automated CRON worker compiles 24-hour telemetry, prompts the Google Gemini API as an aerospace meteorologist, and dispatches an HTML email report to subscribers.
*   **🚨 Millisecond Anomaly Alerts**: An asynchronous Mongoose database lifecycle hook detects severe solar events (e.g., $K_p \ge 6$ or X-Class flares) and immediately broadcasts warnings via SMTP email.

---

## 🛠️ Technology Stack

### Frontend (Client)
*   **Core Framework**: React.js (v18+) & Vite
*   **Styling**: TailwindCSS (custom frosted glassmorphism: `backdrop-filter: blur(12px)`)
*   **Animations**: GSAP (GreenSock Animation Platform)
*   **Data Visualization**: Recharts (SVG chart rendering)
*   **Routing**: React Router SPA

### Backend (Server)
*   **Environment**: Node.js & Express.js
*   **Real-time Layer**: Native `ws` (WebSockets)
*   **Database**: MongoDB & Mongoose ODM
*   **AI Integration**: Google Gemini API via the `@google/genai` SDK
*   **Email Dispatch**: Nodemailer (SMTP relay)

---

## 📁 Repository Structure

```text
helioswatch/
├── client/                 # React Single Page Application (Vite + TailwindCSS)
│   ├── src/                # Frontend source code (components, contexts, pages)
│   ├── public/             # Static public assets (landing canvas frame sequences)
│   ├── tailwind.config.js  # Tailwind configuration
│   └── package.json        # Frontend dependencies
├── server/                 # Node.js backend server
│   ├── models/             # Mongoose database schemas (User, Alert, Telemetry)
│   ├── routes/             # Express API router (auth, users, alerts, telemetry)
│   ├── services/           # Gemini AI service, Email service, WebSockets handler
│   ├── dataIngestion.js    # Autonomous NOAA/NASA polling daemon
│   ├── server.js           # Server entry point (Express + WS setup)
│   └── package.json        # Backend dependencies
├── explain/                # Comprehensive architectural and UI walkthroughs
└── README.md               # Main repository documentation
```

---

## ⚙️ Getting Started & Local Setup

### Prerequisites
*   **Node.js**: `v18.x` or higher
*   **MongoDB**: An active MongoDB database (local or Atlas cluster)
*   **NASA API Key**: Request one from [NASA APIs](https://api.nasa.gov/)
*   **Google Gemini API Key**: Obtain one from [Google AI Studio](https://aistudio.google.com/)
*   **SMTP Mail Server**: Gmail SMTP or any testing mail client (like Mailtrap)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/helioswatch.git
cd helioswatch
```

### Step 2: Configure Environment Variables
Navigate into the `server/` directory, create a `.env` file from the template, and populate it with your keys:
```bash
cd server
cp .env.example .env
```

Ensure the following variables are specified inside `server/.env`:
```ini
PORT=5000
MONGODB_URI=your_mongodb_connection_string
NASA_API_KEY=your_nasa_api_key
JWT_SECRET=your_jwt_signing_secret
EMAIL_USER=your_smtp_sender_email@gmail.com
EMAIL_PASS=your_smtp_app_password
GEMINI_API_KEY=your_google_gemini_api_key
```

---

### Step 3: Install Dependencies

#### Setting up the Backend:
```bash
cd server
npm install
```

#### Setting up the Frontend:
```bash
cd ../client
npm install
```

---

### Step 4: Run the Application Locally

To start the full development ecosystem, run both client and server in separate terminal windows:

#### Start the Backend (API, WebSocket Server, & Ingestion Daemon):
```bash
cd server
npm run dev
# Or run direct entry:
node server.js
```

#### Start the Frontend (Vite Dev Server):
```bash
cd client
npm run dev
```

Your browser will automatically launch, or you can navigate to `http://localhost:5173` to experience **HeliosWatch**.

---

## 🛰️ Monitored Space Weather Metrics
The platform tracks 6 essential real-time parameters:
1.  **Solar Wind Speed ($V_w$)**: Measured in $km/s$. Standard baseline is $\sim 300\text{-}400\ km/s$.
2.  **Proton Density ($N_p$)**: Measured in $p/cm^3$. Determines solar wind pressure.
3.  **Interplanetary Magnetic Field ($B_z$)**: Measured in $nT$. A strongly negative $B_z$ allows solar winds to breach Earth's magnetosphere.
4.  **X-Ray Flux Irradiance**: Indicates solar flare eruptions (Class A, B, C, M, X).
5.  **Planetary K-index ($K_p$)**: A scale from 0 to 9 rating geomagnetic storm severity.
6.  **High-Energy Electron Flux ($>2\text{ MeV}$)**: Monitors orbital radiation hazard levels.

---

## 📄 License
This project is licensed under the MIT License. See the LICENSE file for details.
