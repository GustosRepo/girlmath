require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { priceCheckHandler } = require('./priceCheck');

// ── Warn on missing env vars instead of crashing ──
if (!process.env.SERPAPI_KEY) {
  console.warn('⚠️  WARNING: SERPAPI_KEY is not set. Price checks will fail.');
}
if (!process.env.MAX_CHECKS_PER_USER_PER_DAY) {
  console.warn('⚠️  WARNING: MAX_CHECKS_PER_USER_PER_DAY not set — defaulting to 3.');
}
if (!process.env.CACHE_TTL_HOURS) {
  console.warn('⚠️  WARNING: CACHE_TTL_HOURS not set — defaulting to 12.');
}

const app = express();
app.use(cors());
app.use(express.json());

// Root route — Railway health check + human-readable status
app.get('/', (_req, res) => {
  res.status(200).send('GirlMath API up 💖');
});

// Health endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// Price check endpoint
app.post('/api/price-check', priceCheckHandler);

const PORT = process.env.PORT || 3456;
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`💖 GirlMath backend running on http://0.0.0.0:${PORT}`);
});
