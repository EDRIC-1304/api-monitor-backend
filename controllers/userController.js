const pool = require("../db/connection");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email and password are required" });
  }

  try {
    const hashedPwd = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2)", 
      [email, hashedPwd]
    );
    res.json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, error: "User already exists or database error" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const valid = await bcrypt.compare(password, result.rows[0].password);
    if (!valid) {
      return res.status(401).json({ success: false, error: "Invalid password" });
    }

    // Use the secret from .env or a fallback
    const token = jwt.sign(
        { id: result.rows[0].id }, 
        process.env.JWT_SECRET || "SPACE_SECRET", 
        { expiresIn: '24h' }
    );

    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
};