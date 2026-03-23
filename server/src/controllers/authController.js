const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { sendVerificationEmail } = require("../utils/mailer");

/**
 * Checks if the email domain is allowed (e.g., ufl.edu)
 */
function isUFLEmail(email) {
  if (typeof email !== "string") return false;

  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "ufl.edu")
    .split(",")
    .map(domain => domain.trim().toLowerCase());

  const emailDomain = email.split("@")[1]?.toLowerCase();
  return allowedDomains.includes(emailDomain);
}

/**
 * SIGNUP: Handles user registration, hashing, and sending verification email
 */
async function signup(req, res) {
  console.log("--- START SIGNUP PROCESS ---");
  try {
    const { email, password } = req.body;
    console.log("1. Request Body received for:", email);

    if (!email || !password) {
      console.log("❌ Validation Failed: Missing email or password");
      return res.status(400).json({ error: "Email and password are required." });
    }

    if (!isUFLEmail(email)) {
      console.log("❌ Validation Failed: Non-UFL email used:", email);
      return res.status(400).json({ error: "Only @ufl.edu email addresses are allowed." });
    }

    const normalizedEmail = email.toLowerCase();

    console.log("2. Checking database for existing user...");
    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      console.log("❌ Signup Failed: User already exists");
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    console.log("3. Hashing password...");
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    console.log("4. Inserting new user into database...");
    await pool.query(
      `INSERT INTO users (email, password_hash, is_verified, verification_token, verification_expires)
       VALUES ($1, $2, $3, $4, $5)`,
      [normalizedEmail, passwordHash, false, verificationToken, verificationExpires]
    );
    console.log("✅ User inserted successfully.");

    console.log("5. Attempting to send verification email (This is usually where hangs occur)...");
    // If the server stops here, your Mailer/Nodemailer settings are incorrect
    await sendVerificationEmail(normalizedEmail, verificationToken);
    console.log("✅ Email sent successfully.");

    console.log("6. Sending 201 Success Response to Frontend.");
    return res.status(201).json({
      message: "Account created! Please check your @ufl.edu email to verify your account.",
    });

  } catch (error) {
    console.error("❌ SIGNUP ERROR AT STEP:", error.message);
    // Important: Always send a response even on error so frontend doesn't hang
    return res.status(500).json({ error: "Server error during signup." });
  } finally {
    console.log("--- END SIGNUP PROCESS ---");
  }
}

/**
 * VERIFY EMAIL: Flips the is_verified switch in the DB
 */
async function verifyEmail(req, res) {
  try {
    const { token } = req.params;
    console.log("Verifying token:", token);

    const result = await pool.query(
      `SELECT id, is_verified FROM users 
       WHERE verification_token = $1 AND (verification_expires > NOW() OR verification_expires IS NULL)`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send("<h1>Invalid or expired verification token.</h1>");
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.send("<h1>Email is already verified. You can now log in.</h1>");
    }

    await pool.query(
      `UPDATE users SET is_verified = true, verification_token = NULL, verification_expires = NULL WHERE id = $1`,
      [user.id]
    );

    return res.send("<h1>Email verified successfully!</h1><p>You can now return to the app and sign in.</p>");
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).send("Server error during email verification.");
  }
}

/**
 * LOGIN: Checks credentials and issues a JWT token
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    console.log("Login attempt for:", email);

    const result = await pool.query(
      "SELECT id, email, password_hash, is_verified FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.rows[0];

    if (!user.is_verified) {
      return res.status(403).json({ error: "Please verify your email before logging in." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      message: "Login successful",
      token,
      user: { id: user.id, email: user.email }
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error during login." });
  }
}

module.exports = { signup, verifyEmail, login };