import { initializeDatabase } from './index.js';

async function main() {
  console.log('--- Initializing Textile ERP Database ---');
  try {
    await initializeDatabase();
    console.log('--- Database Initialization Complete ---');
    process.exit(0);
  } catch (err) {
    console.error('Database Initialization Failed:', err);
    process.exit(1);
  }
}

main();
