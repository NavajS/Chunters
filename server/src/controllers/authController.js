const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { sendVerificationEmail } = require("../utils/mailer");

// checks that the email domain is allowed based on environment configuration
function isUFLEmail(email) {
  if (typeof email !== "string") return false;

  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map(domain => domain.trim().toLowerCase());

  const emailDomain = email.split("@")[1]?.toLowerCase();

  return allowedDomains.includes(emailDomain);
}

async function signup(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    if (!isUFLEmail(email)) {
      return res.status(400).json({ error: "Only ufl.edu email addresses are allowed." });
    }

    //normalzing the email address so that it can be verified unsensitve to case
    const normalizedEmail = email.toLowerCase();

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO users (email, password_hash, is_verified, verification_token, verification_expires)
       VALUES ($1, $2, $3, $4, $5)`,
      [normalizedEmail, passwordHash, false, verificationToken, verificationExpires]
    );

    await sendVerificationEmail(normalizedEmail, verificationToken);

    return res.status(201).json({
      message: "Account created. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Server error during signup." });
  }
}

async function verifyEmail(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).send("Missing verification token.");
    }

    const result = await pool.query(
      `SELECT id, is_verified
       FROM users
       WHERE verification_token = $1
         AND verification_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send("Invalid or expired verification token.");
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.send("Email is already verified.");
    }

    await pool.query(
      `UPDATE users
       SET is_verified = true,
           verification_token = NULL,
           verification_expires = NULL
       WHERE id = $1`,
      [user.id]
    );

    // replace "Email verified succesfully" with frontend port for full development
    return res.send("Email verified successfully.");
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).send("Server error during email verification.");
  }
}

module.exports = { signup, verifyEmail };