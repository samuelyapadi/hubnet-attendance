require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const apiRoutes = require('./routes/api');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// ✅ Serve frontend static files correctly
app.use('/scripts', express.static(path.join(__dirname, '../frontend/scripts')));
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ Backend API routes
app.use('/api', apiRoutes);

// ✅ Fallback for frontend routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

console.log('📦 MONGO_URI from env:', process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));
