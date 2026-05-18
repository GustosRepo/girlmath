require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Log every request
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Root route — Railway health check + human-readable status
app.get('/', (_req, res) => {
  res.status(200).send('GirlMath API up 💖');
});

// Health endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// Legal pages (Privacy Policy & Terms of Use)
app.use('/legal', express.static(path.join(__dirname, 'legal')));

const PORT = process.env.PORT || 3456;
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`💖 GirlMath backend running on http://0.0.0.0:${PORT}`);
});
