const axios = require("axios");
const pool = require("../db/connection");

exports.testAPI = async (req, res) => {
  const { url, method } = req.body;
  const userId = req.userId; // Provided by auth middleware
  const startTime = Date.now();

  try {
    const response = await axios({ url, method });
    const responseTime = Date.now() - startTime;

    await pool.query(
      `INSERT INTO logs (url, method, status, response_time, error, retry, retry_success, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [url, method, response.status, responseTime, null, false, false, userId]
    );

    return res.json({ success: true, status: response.status, responseTime, retry: false });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const status = error.response ? error.response.status : 500;

    // RETRY LOGIC
    try {
      const retryResponse = await axios({ url, method });
      await pool.query(
        `INSERT INTO logs (url, method, status, response_time, error, retry, retry_success, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [url, method, retryResponse.status, responseTime, null, true, true, userId]
      );
      return res.json({ success: true, status: retryResponse.status, retry: true, retrySuccess: true });
    } catch (retryError) {
      const retryStatus = retryError.response ? retryError.response.status : 500;
      const explainedError = "Request failed after retry";
      await pool.query(
        `INSERT INTO logs (url, method, status, response_time, error, retry, retry_success, user_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [url, method, retryStatus, responseTime, explainedError, true, false, userId]
      );
      return res.json({ success: false, status: retryStatus, error: explainedError });
    }
  }
};

exports.getLogs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch logs" });
  }
};

exports.getGraphData = async (req, res) => {
  try {
    const userId = req.userId;
    const requests = await pool.query(`
      SELECT TO_CHAR(created_at, 'HH24:MI') as date, COUNT(*) as count
      FROM logs WHERE user_id = $1 GROUP BY date ORDER BY date ASC`, [userId]);

    const errors = await pool.query(`
      SELECT TO_CHAR(created_at, 'HH24:MI') as date, COUNT(*) as count
      FROM logs WHERE status >= 400 AND user_id = $1 GROUP BY date ORDER BY date ASC`, [userId]);

    const latency = await pool.query(`
      SELECT TO_CHAR(created_at, 'HH24:MI') as date, AVG(response_time) as avg_latency
      FROM logs WHERE user_id = $1 GROUP BY date ORDER BY date ASC`, [userId]);

    res.json({
      success: true,
      data: { requests: requests.rows, errors: errors.rows, latency: latency.rows }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Graph data failed" });
  }
};

exports.getFailurePattern = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status FROM logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 5`, [req.userId]);
    const logs = result.rows;
    const allFailed = logs.length === 5 && logs.every(l => l.status >= 400);
    res.json({ success: true, unstable: allFailed });
  } catch (error) {
    res.status(500).json({ success: false, error: "Pattern failed" });
  }
};