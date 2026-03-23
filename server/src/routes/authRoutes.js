const express = require("express");
const router = express.Router();

// Ensure all three are destructured here!
const { signup, verifyEmail, login } = require("../controllers/authController");

router.post("/signup", signup);
router.get("/verify-email/:token", verifyEmail);
router.post("/login", login);

module.exports = router;