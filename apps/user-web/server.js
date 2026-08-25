import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import compression from 'compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

// Enable gzip / deflate compression
app.use(compression());

// Serve static assets with cache headers
app.use(express.static(distPath, {
  maxAge: '1d',
  etag: true
}));

// SPA HTML5 fallback routing
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🌐 [User Web Production] Serving static SPA build on http://localhost:${PORT}`);
});
