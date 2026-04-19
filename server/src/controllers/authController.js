const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { sendVerificationEmail } = require("../utils/mailer");

function isUFLEmail(email) {
  if (typeof email !== "string") return false;
  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || "ufl.edu")
    .split(",")
    .map(domain => domain.trim().toLowerCase());
  // trim before splitting so leading/trailing spaces in the address don't fool the domain check
  const emailDomain = email.trim().split("@")[1]?.toLowerCase();
  return allowedDomains.includes(emailDomain);
}

async function signup(req, res) {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    // Server-side password length guard (mirrors frontend, but can't be bypassed via direct API calls)
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    if (!isUFLEmail(email)) {
      return res.status(400).json({ error: "Only @ufl.edu email addresses are allowed." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // BEGIN transaction — if the email send fails we roll back the insert so
    // the user can try signing up again rather than being permanently locked out.
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO users (email, password_hash, is_verified, verification_token, verification_expires)
       VALUES ($1, $2, $3, $4, $5)`,
      [normalizedEmail, passwordHash, false, verificationToken, verificationExpires]
    );

    await sendVerificationEmail(normalizedEmail, verificationToken);

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Account created! Please check your @ufl.edu email to verify your account.",
    });

  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Signup error:", error.message);
    return res.status(500).json({ error: "Server error during signup." });
  } finally {
    client.release();
  }
}

async function verifyEmail(req, res) {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  try {
    const { token } = req.params;

    const result = await pool.query(
      `SELECT id, is_verified FROM users
       WHERE verification_token = $1 AND verification_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.redirect(`${clientUrl}?error=invalid_token`);
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.redirect(`${clientUrl}?verified=already`);
    }

    await pool.query(
      `UPDATE users SET is_verified = true, verification_token = NULL, verification_expires = NULL WHERE id = $1`,
      [user.id]
    );

    return res.redirect(`${clientUrl}?verified=1`);
  } catch (error) {
    console.error("Verification error:", error);
    return res.redirect(`${process.env.CLIENT_URL || "http://localhost:3000"}?error=server_error`);
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const result = await pool.query(
      "SELECT id, email, password_hash, is_verified, status FROM users WHERE email = $1",
      [email.trim().toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = result.rows[0];

    if (!user.is_verified) {
      return res.status(403).json({ error: "Please verify your email before logging in." });
    }

    if (user.status === "suspended" || user.status === "banned") {
      return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
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
