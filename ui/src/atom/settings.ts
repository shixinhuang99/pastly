import * as AutoStart from '@tauri-apps/plugin-autostart';
import { atom } from 'jotai';
import type { Settings } from '~/types';
import { collectTrayClipItems } from '~/utils/common';
import { updateAutoStartItemChecked, updateTrayMenuItems } from '~/utils/tray';
import { clipItemsAtom, settingsAtom } from './primitive';

async function setAutoStart(autoStart: boolean) {
  const isEnabled = await AutoStart.isEnabled();
  if (autoStart && !isEnabled) {
    await AutoStart.enable();
    return true;
  }
  if (!autoStart && isEnabled) {
    await AutoStart.disable();
    return false;
  }
  return autoStart;
}

export const updateSettingsAtom = atom(
  null,
  async (get, set, value: Settings) => {
    const old = get(settingsAtom);
    set(settingsAtom, value);
    if (old.trayItemsCount !== value.trayItemsCount) {
      const items = get(clipItemsAtom);
      const textClipItems = collectTrayClipItems(items, value.trayItemsCount);
      updateTrayMenuItems(textClipItems);
    }
    setAutoStart(value.autoStart).then((v) => {
      set(settingsAtom, (old) => ({ ...old, autoStart: v }));
      updateAutoStartItemChecked(v);
    });
  },
);

export const initSettingsAtom = atom(null, async (_, set) => {
  const isEnabled = await AutoStart.isEnabled();
  set(settingsAtom, (old) => ({ ...old, autoStart: isEnabled }));
});

export const handleTrayToggleAutoStartAtom = atom(null, async (get, set) => {
  const settings = get(settingsAtom);
  const enabled = await setAutoStart(!settings.autoStart);
  set(settingsAtom, (old) => ({ ...old, autoStart: enabled }));
  updateAutoStartItemChecked(enabled);
});
