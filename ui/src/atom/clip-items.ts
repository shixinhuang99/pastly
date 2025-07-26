import { atom } from 'jotai';
import type { ClipItem, DuplicateIds } from '~/types';
import { collectTrayClipItems } from '~/utils/common';
import {
  deleteAllClipItems,
  deleteClipItem,
  deleteClipItemsByIds,
  deleteImagesByIds,
  findClipItemsByValue,
  findImagesByValue,
  getAllClipItems,
  getAllImages,
  insertClipItem,
  updateClipItem,
} from '~/utils/db';
import { initTrayMenu, updateTrayClipItems } from '~/utils/tray';
import { clipItemsAtom, settingsAtom } from './primitive';

export const initClipItemsAtom = atom(null, async (_, set) => {
  const items = await getAllClipItems();
  set(clipItemsAtom, items);
  const textClipItems = collectTrayClipItems(items);
  await initTrayMenu(textClipItems);
});

export const addClipItemAtom = atom(
  null,
  async (get, set, newClipItem: ClipItem) => {
    const clipItemInDB = await insertClipItem(newClipItem);
    set(clipItemsAtom, (old) => [clipItemInDB, ...old]);

    const settings = get(settingsAtom);
    if (settings.autoDeleteDuplicates) {
      const idSet = new Set<string>();
      const imageIdSet = new Set<string>();

      if (newClipItem.type === 'image') {
        // the value of clipItemInDB is empty
        const duplicateImages = await findImagesByValue(newClipItem.value);
        for (const img of duplicateImages) {
          if (img.id !== newClipItem.id) {
            idSet.add(img.id);
            imageIdSet.add(img.id);
          }
        }
      } else {
        const duplicates = await findClipItemsByValue(
          newClipItem.type === 'files'
            ? JSON.stringify(newClipItem.value)
            : newClipItem.value,
        );
        for (const item of duplicates) {
          if (item.id !== newClipItem.id) {
            idSet.add(item.id);
          }
        }
      }

      if (idSet.size) {
        const ids = Array.from(idSet);
        await deleteClipItemsByIds(ids);
        if (imageIdSet.size) {
          await deleteImagesByIds(Array.from(imageIdSet));
        }
        set(clipItemsAtom, (old) => old.filter((item) => !idSet.has(item.id)));
      }
    }

    if (clipItemInDB.type === 'text') {
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

export const getDuplicateIdsAtom = atom(null, async (get) => {
  const items = get(clipItemsAtom);
  const images = await getAllImages();
  const set = new Set<string>();
  const result: DuplicateIds = { ids: [], imageIds: [] };
  for (const item of items) {
    let key: string | undefined = undefined;
    if (item.type === 'text') {
      key = item.value;
    } else if (item.type === 'files') {
      key = JSON.stringify(item.value);
    } else if (item.type === 'image') {
      key = images.find((image) => image.id === item.id)?.value;
    }
    if (!key) {
      continue;
    }
    if (set.has(key)) {
      result.ids.push(item.id);
      if (item.type === 'image') {
        result.imageIds.push(item.id);
      }
    } else {
      set.add(key);
    }
  }
  return result;
});
