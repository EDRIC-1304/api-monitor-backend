const axios = require("axios");
const pool = require("../db/connection");

exports.testAPI = async (req, res) => {
  const { url, method } = req.body;

  const startTime = Date.now();

  try {
    // FIRST ATTEMPT
    const response = await axios({ url, method });

    const responseTime = Date.now() - startTime;

    await pool.query(
      `INSERT INTO logs (url, method, status, response_time, error, retry, retry_success)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [url, method, response.status, responseTime, null, false, false]
    );

    return res.json({
      success: true,
      status: response.status,
      responseTime,
      retry: false,
      data: response.data,
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;

    const status = error.response ? error.response.status : 500;

    // 🔥 RETRY LOGIC
    try {
      const retryResponse = await axios({ url, method });

      await pool.query(
        `INSERT INTO logs (url, method, status, response_time, error, retry, retry_success)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [url, method, retryResponse.status, responseTime, null, true, true]
      );

      return res.json({
        success: true,
        status: retryResponse.status,
        responseTime,
        retry: true,
        retrySuccess: true,
        message: "Request failed initially but succeeded on retry",
        data: retryResponse.data,
      });

    } catch (retryError) {
      const retryStatus = retryError.response
        ? retryError.response.status
        : 500;

      const explainedError = explainError(retryStatus);

      await pool.query(
        `INSERT INTO logs (url, method, status, response_time, error, retry, retry_success)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [url, method, retryStatus, responseTime, explainedError, true, false]
      );

      return res.json({
        success: false,
        status: retryStatus,
        responseTime,
        retry: true,
        retrySuccess: false,
        error: explainedError,
      });
    }
  }
};

exports.getLogs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM logs ORDER BY created_at DESC LIMIT 50`
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Failed to fetch logs",
    });
  }
};

exports.getGraphData = async (req, res) => {
  try {
    // Requests over time
    const requests = await pool.query(`
      SELECT TO_CHAR(created_at, 'HH24:MI') as date,
        COUNT(*) as count
        FROM logs
        GROUP BY date
        ORDER BY date ASC
    `);

    // Errors over time
    const errors = await pool.query(`
      SELECT TO_CHAR(created_at, 'HH24:MI') as date,
        COUNT(*) as count
        FROM logs
        WHERE status >= 400
        GROUP BY date
        ORDER BY date ASC
    `);

    // Avg latency
    const latency = await pool.query(`
      SELECT TO_CHAR(created_at, 'HH24:MI') as date,
        AVG(response_time) as avg_latency
        FROM logs
        GROUP BY date
        ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: {
        requests: requests.rows,
        errors: errors.rows,
        latency: latency.rows,
      },
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Graph data fetch failed",
    });
  }
};

exports.getFailurePattern = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status FROM logs
      ORDER BY created_at DESC
      LIMIT 5
    `);

    const logs = result.rows;

    const allFailed = logs.length === 5 && logs.every(l => l.status >= 400);

    res.json({
      success: true,
      unstable: allFailed,
      message: allFailed
        ? "API is unstable (last 5 requests failed)"
        : "API is stable",
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: "Pattern detection failed",
    });
  }
};

const explainError = (status) => {
  switch (status) {
    case 400:
      return "Bad request - Check request parameters";
    case 401:
      return "Unauthorized - Authentication required";
    case 403:
      return "Forbidden - Access denied";
    case 404:
      return "Not found - API endpoint does not exist";
    case 500:
      return "Server error - Problem on API server";
    default:
      return "Unexpected error occurred";
  }
};

