# HeliosWatch: Backend & Data Ingestion Pipeline (Part 3)

## 1. Backend Architecture Overview (`server.js`)
The HeliosWatch backend is built on **Node.js** and **Express.js**. It is designed to handle two entirely distinct types of traffic simultaneously:
1. **RESTful HTTP Traffic:** Standard API endpoints for user authentication (`/api/auth/register`, `/api/auth/login`, `/api/auth/forgot-password`).
2. **WebSocket (WS) Traffic:** A high-throughput, low-latency pipeline attached directly to the Node HTTP server, responsible for broadcasting real-time space weather telemetry.

## 2. The Data Ingestion Engine (`dataingestion.js`)
Space weather data is inherently chaotic, distributed across multiple government agencies in varying formats.
- **The Polling Mechanism:** The ingestion script operates autonomously, continuously polling key endpoints: DSCOVR Satellite (Solar Wind), GOES-16/18 (X-Ray Flux), and Ground Magnetometers (Kp Index).
- **Normalization:** Because X-ray data might arrive every 1 minute, but Kp data arrives every 3 hours, `dataingestion.js` interpolates and aligns the timestamps so the frontend receives a single, unified data point containing all metrics for any given minute.
- **Local Caching:** The data is pulled once by the server, processed, and written to a highly-available local cache to prevent rate-limiting from NOAA's APIs.

## 3. Database & Schemas (MongoDB)
We utilize **MongoDB** via **Mongoose ODM**.
- **The `User` Schema:** Stores credentials using `bcryptjs` for hashing. It tracks notification preferences (`receiveAlerts`) and manages OTP (One-Time Password) recovery flows using temporal fields.
- **Mongoose Lifecycle Hooks (`Alert` Schema):** We utilize a Mongoose `post('save')` hook. The exact millisecond the ingestion engine detects a severe space weather anomaly (e.g., Kp > 6) and saves it to the database, this hook automatically fires. It triggers an asynchronous Nodemailer function that instantly emails all subscribed users.

## 4. AI Synthesis & Notification System (`aiService.js`)
HeliosWatch doesn't just display raw numbers; it interprets them using an automated intelligence layer.
- **Data Aggregation:** The backend pulls the previous 24 hours of telemetry from MongoDB, calculating minimums, maximums, and rolling averages.
- **Prompt Engineering:** We inject this massive mathematical array into a highly structured prompt and send it to the Google Gemini API. The prompt explicitly restricts the AI from hallucinating, forcing it to analyze only the provided arrays.
- **Distribution:** The LLM generates a human-readable "Daily Space Weather Report," explaining correlations (e.g., "The spike in solar wind caused the minor geomagnetic storm"). This is compiled into an HTML template and dispatched via Nodemailer.

## 5. WebSockets in Node.js
To simulate a true aerospace mission control center, data must feel instantaneous.
- **The Event Loop:** Node.js is single-threaded but handles concurrency via the Event Loop. When users connect via WebSocket, Node maintains an array of socket references without spawning new threads.
- **The Broadcast Loop:** Every 1000ms, a `setInterval` loop reads the latest 100 data points from the ingestion cache and iterates over the `wss.clients` array, pushing the exact same JSON payload to every open socket globally.

---
## 💡 INTERVIEW Q&A: Backend & AI

**Q: "How did you ensure user passwords are secure?"**
**A:** "I never store plain-text passwords. I use the `bcryptjs` library with 10 salt rounds to mathematically hash the passwords before saving them to MongoDB. When a user logs in, the backend uses `bcrypt.compare()` to validate the hash. Once authenticated, the server issues a stateless JSON Web Token (JWT) signed with a secret key, which the client uses for subsequent authorized requests."

**Q: "Explain how your AI integration works. What prevents it from hallucinating data?"**
**A:** "I don't just ask the AI 'what is the space weather?' Instead, I do all the heavy lifting in Node.js first—calculating the exact minimums, maximums, and averages of the last 24 hours of telemetry. I then use strict Prompt Engineering, injecting this hard mathematical data into the prompt and explicitly commanding the Gemini API to 'only analyze the provided data array' and synthesize it into a readable report. This grounds the LLM in factual telemetry."

**Q: "How does the system know when to send an email alert?"**
**A:** "I built an event-driven architecture using Mongoose Lifecycle Hooks. Instead of running a clumsy `setInterval` to constantly check the database for new anomalies, I attached a `post('save')` hook directly to the Alert schema. The exact moment an anomaly document is committed to the database, the hook automatically fires the Nodemailer dispatcher asynchronously. This ensures zero-latency alerting without locking up the main thread."

**Q: "Why did you choose Node.js for a data-heavy application?"**
**A:** "Node.js utilizes a non-blocking, asynchronous I/O model. Because this project relies heavily on real-time WebSockets to broadcast data to potentially thousands of concurrent users, Node is the perfect choice. It can hold thousands of WebSocket connections open simultaneously on a single thread without consuming massive amounts of RAM, quickly broadcasting the 1Hz payloads seamlessly."
