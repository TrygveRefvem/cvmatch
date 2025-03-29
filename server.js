// Simple express server for serving Next.js app
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Serve the Next.js static files
app.use(express.static(path.join(__dirname, '.next')));
app.use(express.static(path.join(__dirname, 'public')));

// Handle all routes
app.get('*', (req, res) => {
  // Try to serve the static file, otherwise fall back to index
  try {
    const staticPath = path.join(__dirname, '.next/server/pages', req.path);
    res.sendFile(staticPath);
  } catch (err) {
    res.sendFile(path.join(__dirname, '.next/server/pages/index.html'));
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 