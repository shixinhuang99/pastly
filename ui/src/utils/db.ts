import Database from '@tauri-apps/plugin-sql';
import { DB_NAME } from '~/consts';
import type { ClipImage, ClipItem, ClipItemDBSchema } from '~/types';

let dbInstance: Database | null = null;

async function getDbInstance(): Promise<Database> {
  if (!dbInstance) {
    dbInstance = await Database.load(`sqlite:${DB_NAME}`);
  }
  return dbInstance;
}

function normalizeClipItemValue(clipItem: ClipItem): string {
  if (clipItem.type === 'image') {
    return '';
  }
  if (clipItem.type === 'files') {
    return JSON.stringify(clipItem.value);
  }
  return clipItem.value;
}

function convertToClipItems(result: ClipItemDBSchema[]): ClipItem[] {
  return result.map((row) => ({
    id: row.id,
    type: row.type,
    value: row.type === 'files' ? JSON.parse(row.value) : row.value,
    date: row.date,
  }));
}

export async function getAllClipItems(): Promise<ClipItem[]> {
  const db = await getDbInstance();
  const result = await db.select<ClipItemDBSchema[]>(
    'SELECT * FROM clip_items ORDER BY date DESC',
  );
  return convertToClipItems(result);
}

async function getClipItemByID(id: string): Promise<ClipItem> {
  const db = await getDbInstance();
  const result = await db.select<ClipItemDBSchema[]>(
    'SELECT * FROM clip_items WHERE id = $1',
    [id],
  );
  return convertToClipItems(result)[0];
}

export async function insertClipItem(item: ClipItem): Promise<ClipItem> {
  const { id, type, value, date } = item;
  const db = await getDbInstance();
  await db.execute(
    'INSERT INTO clip_items (id, type, value, date) VALUES ($1, $2, $3, $4)',
    [id, type, normalizeClipItemValue(item), date],
  );
  if (type === 'image') {
    await db.execute('INSERT INTO images (id, value) VALUES ($1, $2)', [
      id,
      value,
    ]);
  }
  return getClipItemByID(id);
}

export async function updateClipItem(item: ClipItem): Promise<ClipItem> {
  const { id, type, value, date } = item;
  const db = await getDbInstance();
  await db.execute(
    'UPDATE clip_items SET type = $1, value = $2, date = $3 WHERE id = $4',
    [type, normalizeClipItemValue(item), date, id],
  );
  if (type === 'image') {
    await db.execute('UPDATE images SET value = $1 WHERE id = $2', [value, id]);
  }
  return getClipItemByID(id);
}

export async function deleteClipItem(id: string) {
  const db = await getDbInstance();
  await db.execute('DELETE FROM clip_items WHERE id = $1', [id]);
}

export async function deleteAllClipItems() {
  const db = await getDbInstance();
  await db.execute('DELETE FROM clip_items');
}

export async function migrateImages() {
  const key = '001_migrate_images';
  if (localStorage.getItem(key)) {
    return;
  }
  const db = await getDbInstance();
  const result = await db.select<ClipItemDBSchema[]>(
    'SELECT * FROM clip_items',
  );
  const clipItems: ClipItem[] = result.map((row) => ({
    id: row.id,
    type: row.type,
    value: JSON.parse(row.value),
    date: row.date,
  }));
  for (const item of clipItems) {
    const { id, type, value, date } = item;
    try {
      await db.execute(
        'UPDATE clip_items SET type = $1, value = $2, date = $3 WHERE id = $4',
        [type, normalizeClipItemValue(item), date, id],
      );
      if (item.type === 'image') {
        await db.execute('INSERT INTO images (id, value) VALUES ($1, $2)', [
          id,
          value,
        ]);
      }
    } catch {
      await deleteClipItem(item.id);
    }
  }
  localStorage.setItem(key, '1');
}

export async function getClipImageByID(id: string): Promise<ClipImage> {
  const db = await getDbInstance();
  const result = await db.select<ClipImage[]>(
    'SELECT * FROM images WHERE id = $1',
    [id],
  );
  return result[0];
}

export async function getAllImages(): Promise<ClipImage[]> {
  const db = await getDbInstance();
  const result = await db.select<ClipImage[]>('SELECT * FROM images');
  return result;
}

export async function deleteClipItemsByIds(ids: string[]) {
  const db = await getDbInstance();
  const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
  await db.execute(`DELETE FROM clip_items WHERE id IN (${placeholders})`, ids);
}

export async function deleteImagesByIds(ids: string[]) {
  const db = await getDbInstance();
  const placeholders = ids.map((_, index) => `$${index + 1}`).join(',');
  await db.execute(`DELETE FROM images WHERE id IN (${placeholders})`, ids);
}

export async function findClipItemsByValue(value: string): Promise<ClipItem[]> {
  const db = await getDbInstance();
  const result = await db.select<ClipItemDBSchema[]>(
    'SELECT * FROM clip_items WHERE value = $1',
    [value],
  );
  return convertToClipItems(result);
}

export async function findImagesByValue(value: string): Promise<ClipImage[]> {
  const db = await getDbInstance();
  const result = await db.select<ClipImage[]>(
    'SELECT * FROM images WHERE value = $1',
    [value],
  );
  return result;
}
