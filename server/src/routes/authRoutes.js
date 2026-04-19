const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { signup, verifyEmail, login } = require("../controllers/authController");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

const signupRules = [
  body("email").trim().isEmail().withMessage("A valid email is required."),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
];

const loginRules = [
  body("email").trim().isEmail().withMessage("A valid email is required."),
  body("password").notEmpty().withMessage("Password is required."),
];

router.post("/signup", signupRules, validate, signup);
router.get("/verify-email/:token", verifyEmail);
router.post("/login", loginRules, validate, login);

module.exports = router;
