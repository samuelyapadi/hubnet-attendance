require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const apiRoutes = require('./routes/api');
const shiftRoutes = require('./routes/shifts');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// ✅ API Routes
app.use('/api/shifts', shiftRoutes);
app.use('/api', apiRoutes);

// ✅ Serve static frontend files
app.use('/scripts', express.static(path.join(__dirname, 'frontend/scripts')));
app.use(express.static(path.join(__dirname, 'frontend')));

// ✅ Serve HTML files directly (like /employee-details.html)
app.get('/*.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', req.path));
});

// ✅ Fallback to index.html for non-file routes (e.g., /dashboard)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// ✅ Connect to MongoDB and start server
const PORT = process.env.PORT || 3000;
console.log('📦 MONGO_URI from env:', process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));
