# 🌌 Nebula API Monitor - Backend

The core engine of the API Monitoring Dashboard.  
This Node.js service handles secure authentication, automated API testing with retry logic, and complex data aggregation for analytics.

---

## 🚀 Key Features

- **JWT Authentication** → Secure user sessions with token-based access  
- **Smart Retry System** → Retries failed API requests once before logging failure  
- **Data Isolation** → Users can only access their own logs and analytics  
- **Statistical Aggregation** → Time-series data for traffic and latency using SQL  
- **Pattern Detection** → Determines system stability from recent request history  

---

## 📁 File Structure & Explanations

### `server.js`
- Entry point of the application  
- Initializes Express server  
- Configures CORS  
- Mounts API routes  

---

### `db/connection.js`
- PostgreSQL connection (Supabase)  
- Uses `pg` library  
- SSL-enabled for cloud environments  

---

### `middleware/auth.js`
- JWT verification layer  
- Extracts token from `Authorization` header  
- Attaches `userId` to request object  

---

### `routes/api.js`
- Defines API endpoints  
- Separates:
  - Public routes (Login / Register)  
  - Protected routes (Tester / Logs)  

---

### `controllers/userController.js`

Handles user lifecycle:

- **Register**
  - Input validation  
  - Password hashing using `bcryptjs`  

- **Login**
  - Credential verification  
  - JWT token generation  

---

### `controllers/logController.js`

Core system logic:

- **testAPI**
  - Executes requests using `axios`  
  - Implements retry mechanism  

- **getLogs**
  - Fetches user-specific request history  

- **getGraphData**
  - Aggregates time-based data using PostgreSQL  

- **getFailurePattern**
  - Detects instability if last 5 requests failed  

---

## 🛠 Tech Stack

- **Runtime:** Node.js  
- **Framework:** Express.js  
- **Database:** PostgreSQL (Supabase)  
- **Security:** JWT, bcryptjs  
- **HTTP Client:** Axios  

---

## ⚙️ Environment Variables

Create a `.env` file with:

```env
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
```

---

## ☁️ Deployment (Render)

1. Create a **Web Service** on Render  
2. Connect this repository  
3. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`  
4. Build Command:
```
npm install
```
5. Start Command:
```
node server.js
```

---
