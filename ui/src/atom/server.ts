import { atom } from 'jotai';
import { ipc } from '~/ipc';
import { devicesAtom, serverPendingAtom, settingsAtom } from './primitive';

export const getDevicesAtom = atom(null, (get) => {
  return get(devicesAtom);
});

export const startAndShutdownServerAtom = atom(
  null,
  async (get, set, checked: boolean) => {
    const settings = get(settingsAtom);
    set(serverPendingAtom, true);
    try {
      if (checked) {
        await ipc.startServer(settings);
      } else {
        await ipc.shutdownServer(settings.id);
        set(devicesAtom, []);
      }
      set(settingsAtom, (old) => ({ ...old, server: checked }));
    } finally {
      set(serverPendingAtom, false);
    }
  },
);
