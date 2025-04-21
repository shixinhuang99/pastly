import { atom } from 'jotai';
import { ipc } from '~/ipc';
import { devicesAtom, serverPendingAtom, settingsAtom } from './primitive';
import { validateNameAtom } from './settings';

export const getDevicesAtom = atom(null, (get) => {
  return get(devicesAtom);
});

export const startAndShutdownServerAtom = atom(
  null,
  async (get, set, checked: boolean) => {
    set(validateNameAtom);
    const newSettings = get(settingsAtom);
    set(serverPendingAtom, true);
    try {
      if (checked) {
        await ipc.startServer(newSettings);
      } else {
        await ipc.shutdownServer(newSettings.id);
        set(devicesAtom, []);
      }
      set(settingsAtom, (old) => ({ ...old, server: checked }));
    } finally {
      set(serverPendingAtom, false);
    }
  },
);
