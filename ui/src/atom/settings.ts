import * as AutoStart from '@tauri-apps/plugin-autostart';
import { atom } from 'jotai';
import { UNKNOWN_NAME } from '~/consts';
import { ipc } from '~/ipc';
import { getDefaultSettings } from '~/utils/common';
import { updateAutoStartItemChecked } from '~/utils/tray';
import { hostNameAtom, settingsAtom } from './primitive';
import { startOrShutdownServerAtom } from './server';

async function setAutoStart(autoStart: boolean) {
  if (autoStart) {
    await AutoStart.enable();
  } else {
    await AutoStart.disable();
  }
  const isEnabled = await AutoStart.isEnabled();
  return isEnabled;
}

export const initSettingsAtom = atom(null, async (get, set) => {
  const isEnabled = await AutoStart.isEnabled();
  set(settingsAtom, (old) => ({ ...old, autoStart: isEnabled }));
  updateAutoStartItemChecked(isEnabled);
  const hostName = await ipc.getHostName();
  set(hostNameAtom, hostName);
  const settings = get(settingsAtom);
  if (!settings.name.trim().length || settings.name === UNKNOWN_NAME) {
    set(settingsAtom, (old) => ({ ...old, name: hostName || UNKNOWN_NAME }));
  }
  if (settings.server) {
    await set(startOrShutdownServerAtom, true);
  }
});

export const toggleAutoStartAtom = atom(
  null,
  async (get, set, checked?: boolean) => {
    const settings = get(settingsAtom);
    const enabled = await setAutoStart(checked ?? !settings.autoStart);
    set(settingsAtom, (old) => ({ ...old, autoStart: enabled }));
    updateAutoStartItemChecked(enabled);
  },
);

export const validateNameAtom = atom(null, (get, set) => {
  const settings = get(settingsAtom);
  const hostName = get(hostNameAtom);
  const name = settings.name.trim();
  if (!name) {
    set(settingsAtom, { ...settings, name: hostName || UNKNOWN_NAME });
  } else {
    set(settingsAtom, { ...settings, name });
  }
});

export const resetSettingsAtom = atom(null, async (_, set) => {
  await set(startOrShutdownServerAtom, false);
  await set(toggleAutoStartAtom, false);
  const defaultSettings = getDefaultSettings();
  const hostName = await ipc.getHostName();
  defaultSettings.name = hostName || UNKNOWN_NAME;
  set(settingsAtom, defaultSettings);
});
