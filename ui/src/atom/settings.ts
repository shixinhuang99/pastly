import { atom } from 'jotai';
import type { Settings } from '~/types';
import { collectTrayClipItems } from '~/utils/common';
import { updateTrayMenuItems } from '~/utils/tray';
import { clipItemsAtom, settingsAtom } from './primitive';

export const updateSettingsAtom = atom(null, (get, set, value: Settings) => {
  const old = get(settingsAtom);
  set(settingsAtom, value);
  if (old.trayItemsCount !== value.trayItemsCount) {
    const items = get(clipItemsAtom);
    const textClipItems = collectTrayClipItems(items, value.trayItemsCount);
    updateTrayMenuItems(textClipItems);
  }
});
