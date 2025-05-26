const express = require('express');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// PostgreSQL connection (update with your Supabase/Postgres credentials)
const pool = new Pool({
  connectionString: 'YOUR_SUPABASE_POSTGRES_CONNECTION_STRING'
});

// Nodemailer transporter for Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'othedog92@gmail.com',
    pass: 'uxhh vvfd hhzd ppnx'
  }
});

// 1. Request password reset
app.post('/api/request-reset', async (req, res) => {
  const { email } = req.body;
  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store token in DB
  await pool.query(
    'INSERT INTO password_reset_tokens (user_email, token, expires_at) VALUES ($1, $2, $3)',
    [email, token, expiresAt]
  );

  // Send email
  const resetLink = `http://localhost:5173/it35-lab/change-password?token=${token}`;
  await transporter.sendMail({
    from: 'othedog92@gmail.com',
    to: email,
    subject: 'Password Reset Request',
    html: `<p>Click the link below to reset your password:</p>
           <a href="${resetLink}">${resetLink}</a>
           <p>This link will expire in 1 hour.</p>`
  });

  res.json({ message: 'Reset email sent' });
});

// 2. Validate token
app.post('/api/validate-token', async (req, res) => {
  const { token } = req.body;
  const result = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
    [token]
  );
  if (result.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  res.json({ email: result.rows[0].user_email });
});

// 3. Change password
app.post('/api/change-password', async (req, res) => {
  const { token, newPassword } = req.body;
  // Validate token
  const result = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE token = $1 AND used = false AND expires_at > NOW()',
    [token]
  );
  if (result.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
  const email = result.rows[0].user_email;

  // Update password in your users table (hash in production!)
  await pool.query(
    'UPDATE users SET user_password = $1 WHERE user_email = $2',
    [newPassword, email]
  );

  // Mark token as used
  await pool.query(
    'UPDATE password_reset_tokens SET used = true WHERE token = $1',
    [token]
  );

  res.json({ message: 'Password changed successfully' });
});

app.listen(4000, () => {
  console.log('Server running on http://localhost:4000');
}); 