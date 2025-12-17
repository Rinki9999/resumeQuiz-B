const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

router.post("/", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields required" });

    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ error: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashed
    });

    await newUser.save();

    res.json({ ok: true, msg: "Signup successful", userId: newUser._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed!" });
  }
});

module.exports = router;