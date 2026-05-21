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
// WEBHOOK / POSTBACK ROUTES (MUST COME BEFORE /:id)
// ==============================

// TimeWall postback
router.get(
  "/timewall/postback",
  userController.timewallPostback
);

// IntaSend webhook
router.post(
  "/intasend/webhook",
  userController.intasendWebhook
);

// ==============================
// AUTH ROUTES
// ==============================
router.post("/register", userController.registerUser);

router.post("/login", userController.loginUser);

router.post(
  "/forgot-password",
  userController.forgotPassword
);

router.post(
  "/reset-password/:token",
  userController.resetPassword
);

// ==============================
// FINANCIAL ROUTES
// ==============================
router.post("/withdraw", userController.withdraw);

router.post("/buy", userController.buyPackage);

// ==============================
// USER ROUTES
// ==============================

// IMPORTANT: keep these LAST
router.post("/create", userController.createUser);

router.put("/:id", userController.updateProfile);

router.get("/:id", userController.getUser);

// ==============================
// EXPORT ROUTER
// ==============================
module.exports = router;
