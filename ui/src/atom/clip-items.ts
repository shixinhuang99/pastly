import { atom } from 'jotai';
import type { ClipItem } from '~/types';
import { collectTrayClipItems } from '~/utils/common';
import {
  deleteAllClipItems,
  deleteClipItem,
  deleteExcessClipItems,
  getAllClipItems,
  initClipItemsTable,
  insertClipItem,
  updateClipItem,
} from '~/utils/db';
import { initTrayMenu, updateTrayMenuItems } from '~/utils/tray';
import { clipItemsAtom, settingsAtom } from './primitive';

export const initClipItemsAtom = atom(null, async (get, set) => {
  await initClipItemsTable();
  const items = await getAllClipItems();
  set(clipItemsAtom, items);
  const settings = get(settingsAtom);
  const textClipItems = collectTrayClipItems(items, settings.trayItemsCount);
  await initTrayMenu(textClipItems);
});

export const addClipItemAtom = atom(
  null,
  async (get, set, newClipItem: ClipItem, copiedItemId: string) => {
    const clipItems = get(clipItemsAtom);
    if (copiedItemId && clipItems.length && clipItems[0].id === copiedItemId) {
      return;
    }
    const settings = get(settingsAtom);
    const newClipItems = [newClipItem, ...clipItems];
    if (newClipItems.length > settings.maxItemsCount) {
      newClipItems.splice(settings.maxItemsCount);
    }
    set(clipItemsAtom, newClipItems);
    await insertClipItem(newClipItem);
    await deleteExcessClipItems(settings.maxItemsCount);
    if (newClipItem.type === 'text') {
      set(updateTrayMenuItemsAtom);
    }
  },
);

export const deleteClipItemAtom = atom(null, async (get, set, id: string) => {
  const clipItems = get(clipItemsAtom);
  const newClipItems = clipItems.filter((item) => item.id !== id);
  set(clipItemsAtom, newClipItems);
  await deleteClipItem(id);
  if (window.__pastly.trayClipItemIds.includes(id)) {
    set(updateTrayMenuItemsAtom);
  }
});

export const updateClipItemAtom = atom(
  null,
  async (get, set, newClipItem: ClipItem) => {
    const clipItems = get(clipItemsAtom);
    const newClipItems = clipItems.map((item) => {
      if (item.id === newClipItem.id) {
        return newClipItem;
      }
      return item;
    });
    set(clipItemsAtom, newClipItems);
    await updateClipItem(newClipItem);
  },
);

export const deleteAllClipItemsAtom = atom(null, async (_, set) => {
  set(clipItemsAtom, []);
  await deleteAllClipItems();
  updateTrayMenuItems([]);
});

export const updateTrayMenuItemsAtom = atom(null, async (get) => {
  const items = get(clipItemsAtom);
  const settings = get(settingsAtom);
  const textClipItems = collectTrayClipItems(items, settings.trayItemsCount);
  await updateTrayMenuItems(textClipItems);
});
