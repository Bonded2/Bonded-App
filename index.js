// Simple Express server setup to serve static files
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from frontend dist
app.use(express.static(join(__dirname, 'src/bonded-app-frontend/dist')));

// Handle all routes - direct them to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'src/bonded-app-frontend/dist/index.html'));
});

// Start server if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    // Server started - running silently in production
  });
}

// Export for Vercel
export default app; 