import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:111876354@localhost:5432/gestion_logements",
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (err) {
    console.error('Erreur DB:', err);
    throw err;
  } finally {
    client.release();
  }
}

export { pool };