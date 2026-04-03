const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(403).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "SPACE_SECRET");
    req.userId = decoded.id; // This sets the user ID for the controller to use
    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized" });
  }
};