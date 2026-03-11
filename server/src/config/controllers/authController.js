const crypto = require("crypto");
const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { sendVerificationEmail } = require("../utils/mailer");

// checks that the email is actually a UF email
function isUFLEmail(email) {
  return typeof email === "string" && email.toLowerCase().endsWith("@ufl.edu");
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

    await pool.query(
      `INSERT INTO users (email, password_hash, is_verified, verification_token)
       VALUES ($1, $2, $3, $4)`,
      [normalizedEmail, passwordHash, false, verificationToken]
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
    const { token } = req.query;

    if (!token) {
      return res.status(400).send("Missing verification token.");
    }

    const result = await pool.query(
      "SELECT id, is_verified FROM users WHERE verification_token = $1",
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
           verification_token = NULL
       WHERE id = $1`,
      [user.id]
    );

    return res.send("Email verified successfully.");
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).send("Server error during email verification.");
  }
}

module.exports = { signup, verifyEmail };