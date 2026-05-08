const express = require("express");
const router = express.Router();

const userController = require("../controllers/userController");

// ==============================
// TEST ROUTE
// ==============================
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "User routes working",
  });
});

// ==============================
// AUTH ROUTES
// ==============================

// Register
router.post("/register", userController.registerUser);

// Login
router.post("/login", userController.loginUser);

// ==============================
// USER ROUTES
// ==============================

// Create user
router.post("/create", userController.createUser);

// Get user by ID
router.get("/:id", userController.getUser);

// ==============================
// FINANCIAL ROUTES
// ==============================

// Withdraw
router.post("/withdraw", userController.withdraw);

// Buy package
router.post("/buy", userController.buyPackage);

module.exports = router;