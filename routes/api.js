const express = require("express");
const router = express.Router();

const {
  testAPI,
  getLogs,
  getGraphData,
  getFailurePattern
} = require("../controllers/logController");

// Routes
router.post("/test", testAPI);
router.get("/logs", getLogs);
router.get("/graphs", getGraphData);
router.get("/pattern", getFailurePattern);

module.exports = router;