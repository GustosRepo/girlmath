require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { priceCheckHandler } = require('./priceCheck');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (_req, res) => {
  res.json({ status: 'ok', app: 'GirlMath Backend 💖' });
});

// Price check endpoint
app.post('/api/price-check', priceCheckHandler);

const PORT = process.env.PORT || 3456;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`💖 GirlMath backend running on http://0.0.0.0:${PORT}`);
});
