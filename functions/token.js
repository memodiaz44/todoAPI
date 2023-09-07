const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();
const pool = require('../mysql'); // Import the MySQL connection pool



function generateResetToken() {
    // Generate a random token or use a library to create a secure token
    // For example, you can use the `crypto` module to generate a secure random token
    const token = crypto.randomBytes(4).toString('hex');
    return token;
  }
  
  // Function to generate an expiration timestamp
  function generateExpirationTimestamp() {
    // Calculate the expiration timestamp, for example, by adding a fixed duration to the current timestamp
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 1); // Set the expiration time to 1 hour from now
    return expirationTime;
  }



  async function updateUserResetToken(email, resetToken, expirationTimestamp) {
    try {
      // Execute an SQL query to update the user's record with the reset token and expiration timestamp
      await pool.query(
        'UPDATE users SET reset_token = ?, reset_token_expiration = ? WHERE email = ?',
        [resetToken, expirationTimestamp, email]
      );
    } catch (error) {
      console.error('Error updating user reset token:', error);
      throw error;
    }
  }



  async function sendPasswordResetEmail(email, resetToken) {
    try {
      // Create a Nodemailer transporter
      const transporter = nodemailer.createTransport({
        service: 'Gmail', // Change to your email service provider
        auth: {
          user: process.env.EMAIL, // Your email address
          pass: process.env.PASSWORD, // Your email password
        },
      });
  
      // Send an email with the reset token and a link to the password reset page
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: 'Password Reset',
        text: `To reset your password, click on the following link: http://localhost:3001/reset-password/${resetToken}`,
      });
  
      console.log('Password reset email sent successfully');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  module.exports = {
    generateResetToken,
    generateExpirationTimestamp,
    updateUserResetToken,
    sendPasswordResetEmail

  };