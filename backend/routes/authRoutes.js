const express = require("express");
const router = express.Router();
const User = require("../models/User");

// SIGN UP
router.post("/signup", async (req, res) => {
  const { username, phone } = req.body;
  try {
    // Check if username or phone is missing
    if (!username || !phone) {
      return res.status(400).json({ message: "Username and phone are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: "Username or phone already exists" });
    }

    // Create and save the new user
    const newUser = new User({ username, phone });
    await newUser.save();

    res.status(201).json({ message: "User registered", user: newUser });
  } catch (err) {
    console.error("Signup Error:", err); // Log the error for debugging
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { username, phone } = req.body;
  try {
    // Check if username or phone is missing
    if (!username || !phone) {
      return res.status(400).json({ message: "Username and phone are required" });
    }

    // Find user in database
    const user = await User.findOne({ username, phone });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json({ message: "Login successful", user });
  } catch (err) {
    console.error("Login Error:", err); // Log the error for debugging
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
