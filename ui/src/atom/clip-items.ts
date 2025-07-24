import { atom } from 'jotai';
import type { ClipItem } from '~/types';
import { collectTrayClipItems } from '~/utils/common';
import {
  deleteAllClipItems,
  deleteClipItem,
  getAllClipItems,
  insertClipItem,
  updateClipItem,
} from '~/utils/db';
import { initTrayMenu, updateTrayClipItems } from '~/utils/tray';
import { clipItemsAtom } from './primitive';

export const initClipItemsAtom = atom(null, async (_, set) => {
  const items = await getAllClipItems();
  set(clipItemsAtom, items);
  const textClipItems = collectTrayClipItems(items);
  await initTrayMenu(textClipItems);
});

export const addClipItemAtom = atom(
  null,
  async (_, set, newClipItem: ClipItem) => {
    const clipItem = await insertClipItem(newClipItem);
    set(clipItemsAtom, (old) => [clipItem, ...old]);
    if (clipItem.type === 'text') {
      set(updateTrayMenuItemsAtom);
    }
  },
);

export const deleteClipItemAtom = atom(null, async (_, set, id: string) => {
  set(clipItemsAtom, (old) => old.filter((item) => item.id !== id));
  if (window.__pastly.trayClipItemMap.has(id)) {
    set(updateTrayMenuItemsAtom);
  }
  await deleteClipItem(id);
});

export const updateClipItemAtom = atom(
  null,
  async (_, set, newClipItem: ClipItem) => {
    const clipItem = await updateClipItem(newClipItem);
    set(clipItemsAtom, (old) => {
      return old.map((item) => {
        if (item.id === clipItem.id) {
          return clipItem;
        }
        return item;
      });
    });
  },
);

export const deleteAllClipItemsAtom = atom(null, async (_, set) => {
  await deleteAllClipItems();
  set(clipItemsAtom, []);
  updateTrayClipItems([]);
});

export const updateTrayMenuItemsAtom = atom(null, async (get) => {
  const items = get(clipItemsAtom);
  const textClipItems = collectTrayClipItems(items);
  await updateTrayClipItems(textClipItems);
});
