import { query } from '@/lib/db';

let litOccupantsSchemaChecked = false;

export async function ensureLitOccupantsTable() {
  if (litOccupantsSchemaChecked) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS lit_occupants (
      id SERIAL PRIMARY KEY,
      lit_id INTEGER NOT NULL REFERENCES lits(id) ON DELETE CASCADE,
      collaborateur_id INTEGER NOT NULL REFERENCES collaborateurs(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(lit_id, collaborateur_id)
    )
  `);

  litOccupantsSchemaChecked = true;
}
