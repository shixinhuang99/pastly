import Database from '@tauri-apps/plugin-sql';
import { DB_NAME } from '~/consts';
import type { ClipItem, ClipItemDBSchema } from '~/types';

let dbInstance: Database | null = null;

async function getDbInstance(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load(`sqlite:${DB_NAME}`);
  }
  return dbInstance;
}

export async function initClipItemsTable(): Promise<void> {
  const db = await getDbInstance();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS clip_items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      value TEXT NOT NULL,
      date INTEGER NOT NULL
    )
  `);
}

export async function insertClipItem(item: ClipItem): Promise<void> {
  const { id, type, value, date } = item;
  const db = await getDbInstance();
  await db.execute(
    'INSERT INTO clip_items (id, type, value, date) VALUES ($1, $2, $3, $4)',
    [id, type, JSON.stringify(value), date],
  );
}

export async function getAllClipItems(): Promise<ClipItem[]> {
  const db = await getDbInstance();
  const result = await db.select<ClipItemDBSchema[]>(
    'SELECT * FROM clip_items ORDER BY date DESC',
  );
  return result.map((row) => ({
    id: row.id,
    type: row.type,
    value: JSON.parse(row.value),
    date: row.date,
  }));
}

export async function updateClipItem(item: ClipItem): Promise<void> {
  const { id, type, value, date } = item;
  const db = await getDbInstance();
  await db.execute(
    'UPDATE clip_items SET type = $1, value = $2, date = $3 WHERE id = $4',
    [type, JSON.stringify(value), date, id],
  );
}

export async function deleteClipItem(id: string): Promise<void> {
  const db = await getDbInstance();
  await db.execute('DELETE FROM clip_items WHERE id = $1', [id]);
}

export async function deleteAllClipItems(): Promise<void> {
  const db = await getDbInstance();
  await db.execute('DELETE FROM clip_items');
}
