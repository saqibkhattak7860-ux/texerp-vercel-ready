import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { newDb } from 'pg-mem';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbClient = null;
let isLivePostgres = false;

export async function initializeDatabase() {
  if (dbClient) return dbClient;

  // 1. First attempt to connect to live PostgreSQL if configured
  if (config.db.url || config.db.host) {
    try {
      const pool = new pg.Pool({
        connectionString: config.db.url,
        host: config.db.host,
        port: config.db.port,
        database: config.db.database,
        user: config.db.user,
        password: config.db.password,
        connectionTimeoutMillis: 2000
      });

      const testRes = await pool.query('SELECT 1 as test');
      if (testRes) {
        console.log('✅ Connected successfully to Live PostgreSQL Database:', config.db.database);
        dbClient = pool;
        isLivePostgres = true;
        await runMigrationsAndSeeds(dbClient);
        return dbClient;
      }
    } catch (err) {
      console.log('ℹ️ Live PostgreSQL not reachable (' + err.message + '). Initializing High-Performance In-Memory PostgreSQL Engine...');
    }
  }

  // 2. Fallback to in-memory PostgreSQL engine (pg-mem)
  const memDb = newDb({
    autoCreateForeignKeyIndices: true
  });

  // Register common Postgres helper functions
  memDb.public.registerFunction({
    name: 'version',
    args: [],
    returns: memDb.public.getType('text'),
    implementation: () => 'PostgreSQL 16.0 (pg-mem emulated)'
  });

  memDb.public.registerFunction({
    name: 'round',
    args: [memDb.public.getType('float'), memDb.public.getType('integer')],
    returns: memDb.public.getType('float'),
    implementation: (val, decimals) => {
      const d = Math.pow(10, decimals || 0);
      return Math.round(val * d) / d;
    }
  });

  const adapter = memDb.adapters.createPg();
  const pool = new adapter.Pool();

  dbClient = pool;
  isLivePostgres = false;
  console.log('✅ In-Memory PostgreSQL Engine initialized successfully with pure relational schema');
  await runMigrationsAndSeeds(dbClient);

  return dbClient;
}

export async function query(text, params = []) {
  if (!dbClient) {
    await initializeDatabase();
  }
  try {
    return await dbClient.query(text, params);
  } catch (error) {
    console.error('Database Query Error:', error.message, '\nQuery:', text, '\nParams:', params);
    throw error;
  }
}

export async function getClient() {
  if (!dbClient) {
    await initializeDatabase();
  }
  return dbClient;
}

export function isUsingLivePostgres() {
  return isLivePostgres;
}

// Helper to run schema.sql & seed.sql & initialize default admin passwords
async function runMigrationsAndSeeds(client) {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
    
    // Execute schema
    await client.query(schemaSql);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'Approved'`);
    console.log('✅ Database tables created successfully from schema.sql');

    // Check if roles or users exist
    const usersCheck = await client.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(usersCheck.rows[0]?.count || 0, 10) === 0) {
      console.log('🌱 Creating initial administrator account...');
      const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');
      await client.query(seedSql);

      // Hash password for default users with bcrypt: 'admin123'
      const salt = await bcrypt.genSalt(10);
      const defaultHash = await bcrypt.hash('admin123', salt);
      await client.query('UPDATE users SET password_hash = $1', [defaultHash]);

      // Align auto-increment sequences past the seeded IDs
      const tablesWithSequences = [
        'companies', 'roles', 'users', 'warehouses', 'categories', 'units',
        'items', 'item_warehouse_stocks', 'suppliers', 'customers', 'purchases',
        'purchase_items', 'stock_movements', 'printing_vendors', 'printing_jobs',
        'printing_job_items', 'printing_receipts', 'printing_receipt_items',
        'finished_products', 'production_orders', 'production_materials',
        'production_costs', 'sales_orders', 'sales_order_items', 'deliveries',
        'delivery_items', 'invoices', 'invoice_items', 'payments', 'expenses',
        'expense_categories', 'notifications', 'audit_logs'
      ];

      for (const t of tablesWithSequences) {
        try {
          const maxRes = await client.query(`SELECT COALESCE(MAX(id), 0) as max_id FROM ${t}`);
          const maxId = parseInt(maxRes.rows[0]?.max_id || 0, 10);
          if (maxId > 0) {
            // Check if sequence exists
            await client.query(`SELECT setval(pg_get_serial_sequence('${t}', 'id'), ${maxId})`);
          }
        } catch (seqErr) {
          // Ignore if table has no serial sequence
        }
      }

      console.log('✅ Initial administrator account created. (Default Password: admin123)');
    }
  } catch (err) {
    console.error('Error running migrations/seeds:', err);
    throw err;
  }
}
