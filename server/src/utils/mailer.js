const nodemailer = require("nodemailer");

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
  const verificationLink = `${process.env.BACKEND_URL}/auth/verify-email?token=${token}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: toEmail,
    subject: "Verify your Chunters account",
    html: `
      <h2>Verify your email</h2>
      <p>Thanks for signing up for Chunters.</p>
      <p>Click the link below to verify your account:</p>
      <a href="${verificationLink}">${verificationLink}</a>
      <p>If you did not create this account, you can ignore this email.</p>
    `,
  });
}

module.exports = { transporter, sendVerificationEmail };