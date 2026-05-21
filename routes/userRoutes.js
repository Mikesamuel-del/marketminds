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

router.post("/register", userController.registerUser);

router.get("/timewall/postback", timewallPostback);

router.post("/login", userController.loginUser);

router.post("/intasend/webhook", intasendWebhook);

router.post("/forgot-password", userController.forgotPassword);

router.post("/reset-password/:token", userController.resetPassword);

// ==============================
// FINANCIAL ROUTES (before /:id)
// ==============================

router.post("/withdraw", userController.withdraw);

router.post("/buy", userController.buyPackage);

// ==============================
// USER ROUTES
// ==============================

router.post("/create", userController.createUser);

router.put("/:id", userController.updateProfile);

router.get("/:id", userController.getUser);

module.exports = router;
