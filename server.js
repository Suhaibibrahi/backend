const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs'); // For password hashing
const nodemailer = require('nodemailer'); // For email notifications
const crypto = require('crypto'); // For generating secure tokens

const app = express();
const PORT = 5000;

// MongoDB Atlas connection URI
const uri = "mongodb+srv://Suhaib:Suha1993ib@sq23rdapp.d77lc.mongodb.net/?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=true";

// Create a MongoClient object to interact with MongoDB
const client = new MongoClient(uri);

// Use middleware for CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Middleware to log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Global variable to hold the database connection
let db;

// Connect to MongoDB once at the start
async function connectToDatabase() {
  try {
    await client.connect();
    db = client.db("SQ23rdApp"); // Set database instance
    console.log("Connected to MongoDB!");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1); // Stop the server if DB connection fails
  }
}

// --- Nodemailer Configuration ---
const transporter = nodemailer.createTransport({
  host: 'smtp.mail.me.com', // iCloud SMTP server
  port: 587, // SMTP port for iCloud
  secure: false, // Use STARTTLS
  auth: {
    user: 'suhaib.c130j@icloud.com', // iCloud email
    pass: 'obbn-mxqf-pbqb-vuvz', // App-specific password
  },
});

const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: '"23rd Tactical Airlift Squadron" <suhaib.c130j@icloud.com>', // Sender's email
      to, // Recipient's email
      subject, // Email subject
      text, // Email body
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error.message);
  }
};

// --- Input Validation ---
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);

// --- Registration Endpoint ---
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  // Validate email format
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }

  // Validate password complexity
  if (!isValidPassword(password)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters long and include at least one letter and one number.',
    });
  }

  try {
    const usersCollection = db.collection("users");

    // Check if the user already exists
    const existingUser = await usersCollection.findOne({ personalEmail: email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    // Generate a login email by replacing the domain with @sq23rd.com
    const username = email.split('@')[0]; // Extract username (before @)
    const loginEmail = `${username}@sq23rd.com`; // Append @sq23rd.com

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const newUser = {
      personalEmail: email, // Store the user's original email
      loginEmail: loginEmail, // Store the generated login email
      password: hashedPassword, // Store the hashed password
      status: 'pending', // Default status
    };
    await usersCollection.insertOne(newUser);

    res.status(201).json({
      message: `Registration successful! Your login email will be ${loginEmail}. Your account is pending admin approval.`,
    });
  } catch (error) {
    console.error("Error during registration:", error.message);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

// --- Login Endpoint ---
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const usersCollection = db.collection("users");

    // Find the user by login email
    const user = await usersCollection.findOne({ loginEmail: email });

    if (user) {
      // Check if the user is approved
      if (user.status !== 'approved') {
        return res.status(403).json({ message: 'Your account is pending admin approval.' });
      }

      // Compare passwords
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (isPasswordCorrect) {
        res.status(200).json({ message: 'Login successful!' });
      } else {
        res.status(401).json({ message: 'Invalid email or password.' });
      }
    } else {
      res.status(401).json({ message: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error("Error during login:", error.message);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

// --- Admin Approval Endpoint ---
app.put('/approve/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const usersCollection = db.collection("users");

    // Find the user by their login email
    const user = await usersCollection.findOne({ loginEmail: email });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Approve the user
    await usersCollection.updateOne(
      { loginEmail: email },
      { $set: { status: 'approved' } }
    );

    // Send approval email
    const subject = 'Your Account Has Been Approved';
    const text = `
      Dear User,

      Congratulations! Your account has been approved by the admin. You can now log in using the following credentials:

      Login Email: ${user.loginEmail}
      Password: (the password you registered with)

      Please contact support if you encounter any issues.

      Best regards,
      The 23rd Tactical Airlift Squadron Team
    `;

    await sendEmail(user.personalEmail, subject, text);

    res.status(200).json({ message: 'User approved successfully and email sent!' });
  } catch (error) {
    console.error("Error approving user:", error.message);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

// --- Request Password Reset ---
app.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const usersCollection = db.collection("users");

    // Find the user by their personal email
    const user = await usersCollection.findOne({
      personalEmail: { $regex: new RegExp(`^${email}$`, 'i') }, // Case-insensitive match
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = Date.now() + 3600000; // Token valid for 1 hour

    // Store the token and expiry in the database
    await usersCollection.updateOne(
      { personalEmail: user.personalEmail },
      { $set: { resetToken: token, resetTokenExpiry: tokenExpiry } }
    );

    // Send the reset link via email
    const resetLink = `http://localhost:5000/reset-password?token=${token}`;
    const subject = 'Password Reset Request';
    const text = `
      You requested a password reset. Click the link below to reset your password:
      ${resetLink}
      
      This link will expire in 1 hour.
      
      If you did not request this reset, please ignore this email.
    `;

    await sendEmail(user.personalEmail, subject, text);

    res.status(200).json({ message: 'Password reset email sent!' });
  } catch (error) {
    console.error("Error requesting password reset:", error.message);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

// --- Reset Password ---
app.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required.' });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({
      message: 'Password must be at least 8 characters long and include at least one letter and one number.',
    });
  }

  try {
    const usersCollection = db.collection("users");

    // Find the user by reset token
    const user = await usersCollection.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }, // Ensure the token is still valid
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and clear the reset token
    await usersCollection.updateOne(
      { resetToken: token },
      {
        $set: { password: hashedPassword },
        $unset: { resetToken: "", resetTokenExpiry: "" }, // Remove reset token fields
      }
    );

    res.status(200).json({ message: 'Password reset successful!' });
  } catch (error) {
    console.error("Error resetting password:", error.message);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

// --- Get Pending Users Endpoint ---
app.get('/pending-users', async (req, res) => {
  console.log("GET /pending-users route called"); // Log route access
  try {
    const usersCollection = db.collection("users");

    // Query to fetch pending users
    const pendingUsers = await usersCollection.find({ status: 'pending' }).toArray();

    console.log("Pending Users from DB:", pendingUsers); // Log the fetched users

    res.status(200).json(pendingUsers); // Respond with the pending users
  } catch (error) {
    console.error("Error fetching pending users:", error.message);
    res.status(500).json({ message: 'An error occurred. Please try again.' });
  }
});

// --- Server Listener ---
app.listen(PORT, () => {
  connectToDatabase(); // Ensure database connection is established
  console.log(`Server is running on http://localhost:${PORT}`);
});
