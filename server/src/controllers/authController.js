const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/mailer');

const MIN_PASSWORD_LENGTH = 8;
const isProduction = process.env.NODE_ENV === 'production';
const DUMMY_PASSWORD_HASH = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8D5r7n6PfYI8aAizI0s5momkMumZ5e';

// Returns the backend base URL used in generated email links.
function getBackendUrl() {
  return process.env.BACKEND_URL || 'http://localhost:5050';
}

// Returns the frontend base URL used in reset-password links.
function getClientUrl() {
  return process.env.CLIENT_URL || 'http://localhost:3000';
}

// Validates that an email belongs to one of the allowed domains.
function isUFLEmail(email) {
  if (typeof email !== 'string') return false;

  const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || 'ufl.edu')
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

  const emailDomain = email.trim().split('@')[1]?.toLowerCase();
  return allowedDomains.includes(emailDomain);
}

// Normalizes user-provided email input for consistent storage and comparison.
function normalizeEmail(email) {
  return (email || '').toString().trim().toLowerCase();
}

// Creates a signed JWT for authenticated API access.
function buildAuthToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

// Registers a new user account and triggers email verification.
async function signup(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = (req.body.password || '').toString();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    if (!isUFLEmail(email)) {
      return res.status(400).json({ error: 'Only @ufl.edu email addresses are allowed.' });
    }

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `
      INSERT INTO users (email, password_hash, is_verified, verification_token, verification_expires)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [email, passwordHash, false, verificationToken, verificationExpires],
    );

    try {
      await sendVerificationEmail(email, verificationToken);
      return res.status(201).json({
        message: 'Account created! Please check your @ufl.edu email to verify your account.',
      });
    } catch (mailError) {
      if (!isProduction) {
        return res.status(201).json({
          message: 'Account created. Email could not be sent in development mode.',
          verificationLink: `${getBackendUrl()}/api/auth/verify-email/${verificationToken}`,
        });
      }

      throw mailError;
    }
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Server error during signup.' });
  }
}

// Authenticates a user and returns a JWT on success.
async function login(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = (req.body.password || '').toString();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query(
      `
      SELECT id, email, password_hash, role, is_verified, status, failed_login_attempts, lockout_expires
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [email],
    );

    const user = result?.rows?.[0] || null;
    const passwordHash = user ? user.password_hash : DUMMY_PASSWORD_HASH;
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    const now = new Date();
    const lockedOut = Boolean(user?.lockout_expires && new Date(user.lockout_expires) > now);

    const invalidCredentials = (
      !user
      || lockedOut
      || !passwordMatches
      || !user.is_verified
      || user.status !== 'active'
    );

    if (invalidCredentials) {
      if (user) {
        const failedAttempts = (user.failed_login_attempts || 0) + 1;
        const lockoutExpires = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

        await pool.query(
          `
          UPDATE users
          SET failed_login_attempts = $1,
              lockout_expires = $2
          WHERE id = $3
          `,
          [failedAttempts, lockoutExpires, user.id],
        );
      }

      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await pool.query(
      `
      UPDATE users
      SET failed_login_attempts = 0,
          lockout_expires = NULL
      WHERE id = $1
      `,
      [user.id],
    );

    const token = buildAuthToken(user);

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
}

// Returns a success response for token-based logout on the client.
async function logout(_req, res) {
  return res.json({ message: 'Logout successful.' });
}

// Updates the authenticated user's password and/or email.
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

    const userResult = await pool.query(
      `
      SELECT id, email, password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId],
    );

    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid current password.' });
    }

    const updates = [];
    const params = [];

    if (newPassword) {
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      }

      updates.push(`password_hash = $${params.length + 1}`);
      params.push(await bcrypt.hash(newPassword, 10));
    }

    let verificationToken = null;
    let normalizedNewEmail = null;

    if (newEmail) {
      normalizedNewEmail = normalizeEmail(newEmail);

      if (!isUFLEmail(normalizedNewEmail)) {
        return res.status(400).json({ error: 'Only @ufl.edu email addresses are allowed.' });
      }

      if (normalizedNewEmail !== user.email) {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [normalizedNewEmail]);
        if (existing.rows.length > 0) {
          return res.status(400).json({ error: 'This email is already in use.' });
        }

        verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        updates.push(`email = $${params.length + 1}`);
        params.push(normalizedNewEmail);

        updates.push('is_verified = FALSE');

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
      params,
    );

    if (verificationToken && normalizedNewEmail) {
      try {
        await sendVerificationEmail(normalizedNewEmail, verificationToken);
      } catch (mailError) {
        if (!isProduction) {
          return res.json({
            message: 'Credentials updated. Email verification could not be sent in development mode.',
            verificationLink: `${getBackendUrl()}/api/auth/verify-email/${verificationToken}`,
          });
        }
        throw mailError;
      }
    }

    return res.json({ message: 'Login credentials updated successfully.' });
  } catch (error) {
    console.error('Update credentials error:', error);
    return res.status(500).json({ error: 'Server error during credential update.' });
  }
}

// Verifies a user's email address using a one-time token.
async function verifyEmail(req, res) {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).send('<h1>Missing verification token.</h1>');
    }

    const result = await pool.query(
      `
      SELECT id, is_verified
      FROM users
      WHERE verification_token = $1
        AND verification_expires > NOW()
      LIMIT 1
      `,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(400).send('<h1>Invalid or expired verification token.</h1>');
    }

    const user = result.rows[0];
    if (user.is_verified) {
      return res.send('<h1>Email already verified.</h1>');
    }

    await pool.query(
      `
      UPDATE users
      SET is_verified = TRUE,
          verification_token = NULL,
          verification_expires = NULL,
          updated_at = NOW()
      WHERE id = $1
      `,
      [user.id],
    );

    return res.send('<h1>Email verified successfully!</h1><p>You can now return to the app and sign in.</p>');
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).send('Server error during email verification.');
  }
}

// Starts a password reset flow by creating and emailing a reset token.
async function forgotPassword(req, res) {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const result = await pool.query(
      `
      SELECT id, email, is_verified
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [email],
    );

    if (result.rows.length === 0 || !result.rows[0].is_verified) {
      return res.json({ message: 'If an account exists for this email, a reset link has been sent.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      `
      UPDATE users
      SET reset_token = $1,
          reset_token_expires = $2,
          updated_at = NOW()
      WHERE id = $3
      `,
      [resetToken, resetTokenExpires, result.rows[0].id],
    );

    try {
      await sendPasswordResetEmail(result.rows[0].email, resetToken);
      return res.json({ message: 'If an account exists for this email, a reset link has been sent.' });
    } catch (mailError) {
      if (!isProduction) {
        return res.json({
          message: 'Reset token created. Email could not be sent in development mode.',
          resetLink: `${getClientUrl()}/reset-password/${resetToken}`,
        });
      }

      throw mailError;
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ error: 'Server error while requesting password reset.' });
  }
}

// Resets a user's password when given a valid reset token.
async function resetPassword(req, res) {
  try {
    const { token } = req.params;
    const password = (req.body.password || '').toString();

    if (!token) {
      return res.status(400).json({ error: 'Reset token is required.' });
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    const result = await pool.query(
      `
      SELECT id
      FROM users
      WHERE reset_token = $1
        AND reset_token_expires > NOW()
      LIMIT 1
      `,
      [token],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `
      UPDATE users
      SET password_hash = $1,
          reset_token = NULL,
          reset_token_expires = NULL,
          updated_at = NOW()
      WHERE id = $2
      `,
      [passwordHash, result.rows[0].id],
    );

    return res.json({ message: 'Password reset successful. You can now sign in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ error: 'Server error while resetting password.' });
  }
}

// Returns profile details for the currently authenticated user.
async function getAccount(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const result = await pool.query(
      'SELECT id, email, display_name, role, created_at FROM users WHERE id = $1 LIMIT 1',
      [userId],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name || '',
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error('Get account error:', error);
    return res.status(500).json({ error: 'Server error while fetching account.' });
  }
}

// Updates the authenticated user's public display name.
async function updateDisplayName(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const displayName = ((req.body.displayName || '')).toString().trim();

    if (displayName.length > 50) {
      return res.status(400).json({ error: 'Display name must be 50 characters or less.' });
    }

    await pool.query(
      'UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2',
      [displayName || null, userId],
    );

    return res.json({ message: 'Display name updated.', displayName });
  } catch (error) {
    console.error('Update display name error:', error);
    return res.status(500).json({ error: 'Server error while updating display name.' });
  }
}

// Permanently deletes the authenticated user's account after password confirmation.
async function deleteAccount(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const password = (req.body.password || '').toString();
    if (!password) {
      return res.status(400).json({ error: 'Password is required to delete your account.' });
    }

    const result = await pool.query(
      'SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1',
      [userId],
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    return res.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Server error while deleting account.' });
  }
}

module.exports = {
  signup,
  login,
  logout,
  updateCredentials,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getAccount,
  updateDisplayName,
  deleteAccount,
};