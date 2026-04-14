const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendVerificationEmail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'replace_this_with_a_secure_secret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '1h';
const DUMMY_PASSWORD_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8t2u7f2KQqB3lb5Zt/p/8OIyAdA6sy';

function isUFLEmail(email) {
  if (typeof email !== 'string') return false;

  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || '')
    .split(',')
    .map(domain => domain.trim().toLowerCase());

  const emailDomain = email.split('@')[1]?.toLowerCase();

  return allowedDomains.includes(emailDomain);
}

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

async function signup(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (!isUFLEmail(email)) {
      return res.status(400).json({ error: 'Only ufl.edu email addresses are allowed.' });
    }

    const normalizedEmail = email.toLowerCase();

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO users (email, password_hash, is_verified, verification_token, verification_expires)
       VALUES ($1, $2, $3, $4, $5)`,
      [normalizedEmail, passwordHash, false, verificationToken, verificationExpires]
    );

    await sendVerificationEmail(normalizedEmail, verificationToken);

    return res.status(201).json({
      message: 'Account created. Please check your email to verify your account.',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Server error during signup.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase();
    const result = await pool.query(
      `SELECT id, email, password_hash, role, is_verified, status, failed_login_attempts, lockout_expires
       FROM users
       WHERE email = $1`,
      [normalizedEmail]
    );

    const user = result.rows[0];
    const passwordHash = user ? user.password_hash : DUMMY_PASSWORD_HASH;
    const passwordMatches = await bcrypt.compare(password, passwordHash);
    const now = new Date();

    if (user?.lockout_expires && new Date(user.lockout_expires) > now) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const invalidCredentials = !user || !passwordMatches || !user.is_verified || user.status !== 'active';

    if (invalidCredentials) {
      if (user) {
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const lockoutExpires = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

        await pool.query(
          `UPDATE users
           SET failed_login_attempts = $1,
               lockout_expires = $2
           WHERE id = $3`,
          [failedAttempts, lockoutExpires, user.id]
        );
      }

      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await pool.query(
      `UPDATE users
       SET failed_login_attempts = 0,
           lockout_expires = NULL
       WHERE id = $1`,
      [user.id]
    );

    const token = generateToken(user);

    return res.json({
      token,
      user: {
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
}

async function logout(req, res) {
  return res.json({ message: 'Logout successful.' });
}

async function updateCredentials(req, res) {
  try {
    const { currentPassword, newPassword, newEmail } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }

    const result = await pool.query(
      `SELECT id, email, password_hash
       FROM users
       WHERE id = $1`,
      [userId]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid current password.' });
    }

    const updates = [];
    const params = [];
    let verificationToken;
    let normalizedNewEmail;

    if (newPassword) {
      updates.push(`password_hash = $${params.length + 1}`);
      params.push(await bcrypt.hash(newPassword, 10));
    }

    if (newEmail) {
      normalizedNewEmail = newEmail.toLowerCase();

      if (!isUFLEmail(normalizedNewEmail)) {
        return res.status(400).json({ error: 'Only ufl.edu email addresses are allowed.' });
      }

      if (normalizedNewEmail !== user.email) {
        const emailCheck = await pool.query(
          `SELECT id FROM users WHERE email = $1`,
          [normalizedNewEmail]
        );

        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ error: 'This email is already in use.' });
        }

        verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        updates.push(`email = $${params.length + 1}`);
        params.push(normalizedNewEmail);
        updates.push(`is_verified = false`);
        updates.push(`verification_token = $${params.length + 1}`);
        params.push(verificationToken);
        updates.push(`verification_expires = $${params.length + 1}`);
        params.push(verificationExpires);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No credential changes provided.' });
    }

    updates.push('updated_at = NOW()');
    params.push(user.id);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}`,
      params
    );

    if (verificationToken && normalizedNewEmail) {
      await sendVerificationEmail(normalizedNewEmail, verificationToken);
    }

    return res.json({ message: 'Login credentials updated successfully.' });
  } catch (error) {
    console.error('Update credentials error:', error);
    return res.status(500).json({ error: 'Server error during credential update.' });
  }
}

async function verifyEmail(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).send('Missing verification token.');
    }

    const result = await pool.query(
      `SELECT id, is_verified
       FROM users
       WHERE verification_token = $1
         AND verification_expires > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).send('Invalid or expired verification token.');
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.send('Email is already verified.');
    }

    await pool.query(
      `UPDATE users
       SET is_verified = true,
           verification_token = NULL,
           verification_expires = NULL
       WHERE id = $1`,
      [user.id]
    );

    return res.send('Email verified successfully.');
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).send('Server error during email verification.');
  }
}

module.exports = { signup, login, logout, updateCredentials, verifyEmail };