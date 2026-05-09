require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ==========================
// 🔧 MIDDLEWARE
// ==========================
app.use(cors());
app.use(express.json());

// ==========================
// 🗄️ MONGODB CONNECTION
// ==========================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

// ==========================
// 📦 ROUTES
// ==========================

// User routes
app.use("/api/user", require("./routes/userRoutes"));

// Payment routes
app.use("/api/payment", require("./routes/paymentRoutes"));

// ==========================
// 🩺 API HEALTH CHECKS
// ==========================
app.get("/api/user/test", (req, res) => {
  res.send("User routes working");
});

// ==========================
// 🧪 TEST ROUTE
// ==========================
app.get("/", (req, res) => {
  res.send("🚀 API is running...");
});

// ==========================
// 🚀 SERVER START
// ==========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
