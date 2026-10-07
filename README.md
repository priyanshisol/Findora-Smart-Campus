# Findora – Smart Campus Lost & Found System

**Findora** is a full-stack, responsive web application designed for university campuses. It allows students and campus administrators to report lost or found items, search belongings, calculate smart algorithm matches, and process verified item claims.

---

## 🚀 Key Features

1. **Smart Matching Algorithm**:
   - Scores similarity between lost and found items across 5 weighted parameters:
     - Item Title Similarity: **35%**
     - Description Jaccard Keyword Overlap: **25%**
     - Category Match: **15%**
     - Location Proximity (Haversine Formula): **15%**
     - Date Gap Proximity: **10%**
   - Ranks matches into **High (≥70%)**, **Medium (45-69%)**, and **Low (25-44%)** confidence categories.

2. **MongoDB Database Architecture**:
   - Single source of truth for all users, lost/found items, claims, notifications, matches, and activity logs.
   - Built-in automatic fallback to `mongodb-memory-server` if a local standalone MongoDB instance is unavailable.

3. **Authentication & Security**:
   - JSON Web Token (JWT) transmitted via **HTTP-only secure cookies**.
   - Password hashing using **bcrypt**.
   - Role-Based Access Control (**Student** vs **Administrator**).
   - Sensitive internal details (serial numbers, private evidence) restricted exclusively to claimants and campus safety admins.

4. **Interactive Administrator Analytics**:
   - Built with **Chart.js**:
     - Lost vs Found Item Distribution (Doughnut Chart)
     - Reports by Category (Bar Chart)
     - Claim Status Queue Breakdown (Pie Chart)

5. **HTML5 Geolocation & Media**:
   - One-click GPS location detection with manual text fallbacks.
   - Drag-and-drop file upload with preview and image removal powered by **Multer**.

6. **Notification Engine**:
   - Real-time in-app dropdown with unread counter badge and mark-as-read controls.

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Modern SaaS design system with dark/light themes), JavaScript (ES6+ Vanilla), Bootstrap 5.3, Chart.js, Bootstrap Icons.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB, Mongoose ORM.
- **Authentication**: JWT, bcryptjs, cookie-parser.

---

## 🔑 Pre-Seeded Demo Accounts

The database comes pre-seeded with sample campus data and demo user accounts:

| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@campus.edu` | `adminpassword123` | Full admin privileges, claims approval, analytics |
| **Student** | `alex.morgan@campus.edu` | `student123` | Computer Science student with active reports |
| **Student** | `sophia.chen@campus.edu` | `student123` | Business student with found reports |

*(Quick one-click login buttons are also provided directly inside the Login modal)*

---

## 🚦 Local Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- NPM

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Seed Sample Data into MongoDB
```bash
npm run seed
```

### Step 3: Start the Backend Server
```bash
npm start
```
* Or start with auto-reload:
```bash
npm run dev
```

### Step 4: Access Application
Open your browser and visit:
```
http://localhost:5000
```

---

## 📡 REST API Summary

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- **Items**: `GET /api/items`, `POST /api/items`, `GET /api/items/:id`, `PUT /api/items/:id`, `DELETE /api/items/:id`, `GET /api/items/:id/matches`
- **Claims**: `POST /api/claims`, `GET /api/claims/my`, `GET /api/admin/claims`, `PUT /api/admin/claims/:id`
- **Notifications**: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
- **Admin**: `GET /api/admin/dashboard`, `GET /api/admin/analytics`, `GET /api/admin/users`, `PATCH /api/admin/items/:id/status`, `DELETE /api/admin/items/:id`
