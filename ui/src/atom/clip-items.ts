import { atom } from 'jotai';
import type { ClipItem } from '~/types';
import { collectTrayClipItems } from '~/utils/common';
import {
  deleteAllClipItems,
  deleteClipItem,
  getAllClipItems,
  initClipItemsTable,
  insertClipItem,
  updateClipItem,
} from '~/utils/db';
import { initTrayMenu, updateTrayMenuItems } from '~/utils/tray';
import { clipItemsAtom } from './primitive';

export const initClipItemsAtom = atom(null, async (_, set) => {
  await initClipItemsTable();
  const items = await getAllClipItems();
  set(clipItemsAtom, items);
  const textClipItems = collectTrayClipItems(items);
  await initTrayMenu(textClipItems);
});

export const addClipItemAtom = atom(
  null,
  async (_, set, newClipItem: ClipItem) => {
    if (window.__pastly.copiedItemId) {
      return;
    }
    set(clipItemsAtom, (old) => [newClipItem, ...old]);
    if (newClipItem.type === 'text') {
      set(updateTrayMenuItemsAtom);
    }
    await insertClipItem(newClipItem);
  },
);

export const deleteClipItemAtom = atom(null, async (_, set, id: string) => {
  set(clipItemsAtom, (old) => old.filter((item) => item.id !== id));
  if (window.__pastly.trayClipItemIds.has(id)) {
    set(updateTrayMenuItemsAtom);
  }
  await deleteClipItem(id);
});

export const updateClipItemAtom = atom(
  null,
  async (_, set, newClipItem: ClipItem) => {
    set(clipItemsAtom, (old) => {
      return old.map((item) => {
        if (item.id === newClipItem.id) {
          return newClipItem;
        }
        return item;
      });
    });
    await updateClipItem(newClipItem);
  },
);

export const deleteAllClipItemsAtom = atom(null, async (_, set) => {
  await deleteAllClipItems();
  set(clipItemsAtom, []);
  updateTrayMenuItems([]);
});

export const updateTrayMenuItemsAtom = atom(null, async (get) => {
  const items = get(clipItemsAtom);
  const textClipItems = collectTrayClipItems(items);
  await updateTrayMenuItems(textClipItems);
});
