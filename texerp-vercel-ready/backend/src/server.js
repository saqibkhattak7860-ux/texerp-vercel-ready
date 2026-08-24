import app from './app.js';
import { config } from './config/index.js';
import { initializeDatabase } from './db/index.js';

async function startServer() {
  try {
    console.log('🔄 Initializing Database Layer...');
    await initializeDatabase();

    app.listen(config.port, () => {
      console.log(`🚀 Textile ERP Backend running on http://localhost:${config.port}`);
      console.log(`📡 API Health available at http://localhost:${config.port}/api/health`);
    });
  } catch (err) {
    console.error('❌ Failed to start Textile ERP server:', err);
    process.exit(1);
  }
}

startServer();
