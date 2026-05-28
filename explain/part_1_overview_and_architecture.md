# HeliosWatch: Project Overview & Architecture (Part 1)

## 1. Executive Summary
**HeliosWatch** is a state-of-the-art, real-time space weather dashboard and educational platform. Designed to simulate a premium aerospace command center, the platform aggregates live telemetry from NASA and NOAA satellites (such as DSCOVR and GOES) to monitor solar activity, geomagnetic storms, and radiation levels. 

Our goal is to transform complex astronomical data into an accessible, cinematic, and immersive web experience that feels less like a traditional data-table and more like a high-end, glassmorphic mission control interface.

## 2. Core Project Goals
- **Premium Aesthetics:** We use sophisticated dark-mode glassmorphism (translucent panels with subtle white borders), clean typographic hierarchy (Inter/Outfit fonts), and cinematic canvas backgrounds, avoiding overused sci-fi tropes.
- **Cinematic Scrollytelling:** A seamless user journey. Upon login, the platform transitions the user through a pre-loaded, high-performance canvas image sequence directly into the live dashboard without loading screens or jarring jumps.
- **Real-Time Telemetry:** Achieving near-zero latency data delivery. As satellites beam data to Earth, HeliosWatch processes and streams it directly to the user's screen at 1Hz.
- **Integrated Education:** The "Mission Academy" translates live data into interactive, contextual lessons, allowing users to understand complex metrics while looking at actual, real-time measurements.

## 3. The Technology Stack
We have selected a highly performant, modern Javascript stack capable of handling rapid state updates and complex animations.

### **Frontend (Client)**
- **Framework:** React 18 (via Vite for lightning-fast HMR and build times).
- **Styling:** TailwindCSS (heavily customized for specific glassmorphism utilities `rgba(255,255,255,0.05)`).
- **Animation Engine:** GSAP (GreenSock Animation Platform) + ScrollToPlugin.
- **Charting:** Recharts and custom SVG components.

### **Backend (Server)**
- **Runtime:** Node.js with Express.js.
- **Database:** MongoDB (using Mongoose ODM) for persistent storage of user credentials, OTPs, and system alerts.
- **Real-Time Delivery:** Native WebSockets (`ws` library) broadcasting a unified telemetry payload.
- **Authentication:** JWT (JSON Web Tokens) for session management, bcrypt for hashing, Nodemailer for OTPs.

## 4. High-Level Data Pipeline
How does data get from a satellite 1.5 million kilometers away to the user's screen?

1. **Ingestion (`dataingestion.js`):** A dedicated background service continuously polls NOAA Space Weather Prediction Center (SWPC) and NASA APIs. It fetches raw JSON data (Solar Wind, X-Ray Flux, Proton Density).
2. **Normalization & Caching:** The backend normalizes the disparate API structures into a single, clean Javascript object. It aligns timestamps and caches it in memory.
3. **Broadcasting (`server.js`):** The WebSocket server reads the cached telemetry every 1000ms and broadcasts a `telemetry_update` event to all connected React clients.
4. **Client Consumption (`TelemetryContext.jsx`):** The frontend's WebSocket listener receives the payload, updates a global React state, and triggers precise re-renders.

## 5. Core Architectural Decisions (Why did we use X?)

### Why React + Vite?
- **Component Reusability:** The dashboard consists of multiple identical modules. React's component-based architecture makes this highly modular.
- **Virtual DOM for High Frequency Data:** Because our WebSocket pushes data every 1000ms (1Hz), manipulating the real DOM directly would cause severe performance bottlenecks. React's Virtual DOM batches these rapid updates and only re-renders the specific SVG nodes that actually changed.

### Why WebSockets (ws) instead of HTTP Polling?
- **Overhead:** Standard HTTP requests require establishing a TCP connection, sending HTTP headers, waiting for a response, and closing the connection. Doing this every 1 second (HTTP Polling) would overload the server.
- **Bi-directional Persistent Connection:** WebSockets establish a single, persistent TCP connection. Once open, the server can push raw telemetry payloads to the client instantly with minimal overhead, achieving true "zero-latency" streaming.

### Why MongoDB?
- **Schema Flexibility:** Space weather data from NOAA is notoriously unstructured and prone to changing formats. A NoSQL database like MongoDB allows us to ingest massive, fluctuating JSON arrays without strict schemas breaking the database.

---
## 💡 INTERVIEW Q&A: Architecture

**Q: "What is the biggest architectural challenge you faced?"**
**A:** "The biggest challenge was handling asynchronous, disparate data sources. NOAA updates X-Ray flux every minute, but updates the Kp Index every 3 hours. If I just sent raw data to the frontend, the charts would break because timestamps wouldn't align. I solved this by building an ingestion engine that interpolates missing values and aligns everything to a strict 1-minute resolution array before broadcasting it over WebSockets."

**Q: "Why did you separate the ingestion script (`dataingestion.js`) from the main server loop?"**
**A:** "To adhere to the Single Responsibility Principle and avoid blocking the Node.js event loop. Polling external government APIs is subject to network timeouts and rate-limits. If I did this inside the main WebSocket broadcast loop, a slow response from NASA would cause the entire WebSocket server to freeze for all users. By separating them, the ingestion script updates a local cache asynchronously, and the WebSocket server simply reads from that fast local cache."

**Q: "How does your architecture scale if 10,000 users log in at once?"**
**A:** "Because the client data is strictly broadcasted via WebSockets from a local cache, the Node.js server doesn't make 10,000 database queries. It makes ONE database/cache read per second, and pushes that same payload to all 10,000 active sockets. To scale further, I could introduce Redis as an in-memory datastore and utilize a load balancer (like NGINX) across multiple Node instances using a WebSocket pub/sub model."
