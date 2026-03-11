const express = require("express");
const router = express.Router();
const { signup, verifyEmail } = require("../controllers/authController");

router.post("/signup", signup);
router.get("/verify-email", verifyEmail);

module.exports = router;