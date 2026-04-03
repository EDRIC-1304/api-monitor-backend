const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth"); // Make sure this file exists
const { testAPI, getLogs, getGraphData, getFailurePattern } = require("../controllers/logController");
const { register, login } = require("../controllers/userController");

// Public
router.post("/register", register);
router.post("/login", login);

// Protected (Only logged in users can access these)
router.post("/test", auth, testAPI);
router.get("/logs", auth, getLogs);
router.get("/graphs", auth, getGraphData);
router.get("/pattern", auth, getFailurePattern);

module.exports = router;