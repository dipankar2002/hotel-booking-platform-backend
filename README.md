
# 🏨 Hotel Booking Platform Backend

A complete backend system for a hotel booking platform built using **Node.js, Express, PostgreSQL, JWT, and Zod**.

---

## 🚀 Features

### 🔐 Authentication

* User Signup (Customer / Owner)
* Login with JWT
* Password hashing using bcrypt

### 🏨 Hotel Management (Owner)

* Create hotel
* Add rooms
* Manage hotel data

### 🔍 Search & Discovery

* Search hotels by:

  * City
  * Country
  * Price range
  * Rating
* Minimum room price calculation

### 🛏️ Booking System

* Book rooms (future dates only)
* Prevent double booking
* Capacity validation
* Owner cannot book own hotel
* Transaction-based booking (race condition safe)

### 📄 Booking Management

* View user bookings
* Cancel booking (24-hour rule)

### ⭐ Reviews System

* Review after checkout
* One review per booking
* Auto-update hotel rating

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express
* **Database:** PostgreSQL
* **Authentication:** JWT
* **Validation:** Zod
* **Security:** bcrypt

---

## 📂 Project Structure

```
src/
 ├── controllers/
 ├── routes/
 ├── middlewares/
 ├── db/
 ├── zod/
 ├── utils/
 └── server.js
```

---

## ⚙️ Environment Variables

Create `.env` file:

```
PORT=5000
DATABASE_URL=your_postgres_connection
JWT_SECRET=your_secret
```

---

## 🧪 API Endpoints

### Auth

* POST `/api/auth/signup`
* POST `/api/auth/login`

### Hotels

* POST `/api/hotels`
* POST `/api/hotels/:hotelId/rooms`
* GET `/api/hotels`
* GET `/api/hotels/:hotelId`

### Bookings

* POST `/api/bookings`
* GET `/api/bookings`
* PUT `/api/bookings/:bookingId/cancel`

### Reviews

* POST `/api/reviews`

---

## 🔥 Key Highlights

* Transaction handling using PostgreSQL
* Overlap detection for bookings
* Role-based access control
* Clean API response format
* Real-world business logic implementation

---

## 🧠 Learning Outcomes

* Backend architecture design
* REST API design
* SQL joins and aggregation
* Authentication & authorization
* Handling edge cases and validations

---

## 🚀 How to Run

```
npm install
npm run dev
```

---

## 📌 Future Improvements

* Pagination
* Redis caching
* Payment integration
* Image upload
* Admin dashboard

---

## 👨‍💻 Author

**Dip (Full Stack Developer)**
