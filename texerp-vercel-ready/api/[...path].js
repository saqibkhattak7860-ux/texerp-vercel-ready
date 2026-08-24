import app from '../backend/src/app.js';
import { initializeDatabase } from '../backend/src/db/index.js';

let databaseReady;

export default async function handler(req, res) {
  databaseReady ??= initializeDatabase();

  try {
    await databaseReady;
  } catch (error) {
    databaseReady = undefined;
    console.error('Database initialization failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Database initialization failed.'
    });
  }

  // Depending on the Vercel routing shape, Express may receive the path
  // without the /api prefix. Normalize it so the existing /api router works.
  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}
