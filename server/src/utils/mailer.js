const nodemailer = require("nodemailer");
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

async function sendVerificationEmail(toEmail, token) {
  // Use BACKEND_URL from your .env so the user clicks and hits your Express server directly
  const verificationLink = `${process.env.BACKEND_URL || 'http://localhost:5050'}/api/auth/verify-email/${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: "Verify your Chunters account",
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
    console.log(`✉️ Verification email sent to: ${toEmail}`);
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    // Throwing the error lets the auth controller know it failed so it can tell the user
    throw new Error('Failed to send verification email');
  }
}

module.exports = { transporter, sendVerificationEmail };