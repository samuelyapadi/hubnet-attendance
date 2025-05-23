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

// ✅ Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// ✅ Mount backend API
app.use('/api', apiRoutes);

// ❌ DO NOT use a wildcard fallback unless building single-page app
// This caused .js files to be served as HTML, resulting in MIME errors
// If fallback behavior is needed later, re-add with proper file-type checking

console.log('📦 MONGO_URI from env:', process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Server running on port ${process.env.PORT}`);
    });
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));
