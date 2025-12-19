const { onRequest } = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

/**
 * Health check
 */
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

/**
 * Create room
 */
app.post("/rooms/create", (req, res) => {
  const roomId = crypto.randomUUID();
  res.json({ roomId });
});

/**
 * Join room
 */
app.post("/rooms/:roomId/join", (req, res) => {
  const { roomId } = req.params;
  res.json({ joined: true, roomId });
});

exports.api = onRequest(app);
