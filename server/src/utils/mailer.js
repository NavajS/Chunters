const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Returns the backend base URL for verification links.
function getBackendUrl() {
  return process.env.BACKEND_URL || 'http://localhost:5050';
}

// Returns the frontend base URL for password reset links.
function getClientUrl() {
  return process.env.CLIENT_URL || 'http://localhost:3000';
}

// Sends account verification instructions to a newly registered user.
async function sendVerificationEmail(toEmail, token) {
  const verificationLink = `${getBackendUrl()}/api/auth/verify-email/${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: 'Verify your Chunters account',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
          <h2 style="color: #5b5fc7;">Verify your email</h2>
          <p>Thanks for signing up for Chunters.</p>
          <p>Click the link below to verify your account:</p>
          <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #5b5fc7; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Verify Account</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${verificationLink}</p>
          <p>If you did not create this account, you can ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #888;">Only @ufl.edu emails are accepted. Your identity remains anonymous to other users.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

// Sends a password reset email with a one-time reset link.
async function sendPasswordResetEmail(toEmail, token) {
  const resetLink = `${getClientUrl()}/reset-password/${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: 'Reset your Chunters password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
          <h2 style="color: #5b5fc7;">Password reset request</h2>
          <p>We received a request to reset your Chunters password.</p>
          <p>Use the link below to choose a new password. This link expires in 1 hour.</p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #5b5fc7; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p>${resetLink}</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

module.exports = {
  transporter,
  sendVerificationEmail,
  sendPasswordResetEmail,
};
