import { atom } from 'jotai';
import { ipc } from '~/ipc';
import { updateServerItemChecked } from '~/utils/tray';
import { clearDeivcesAtom } from './devices';
import { devicesAtom, serverPendingAtom, settingsAtom } from './primitive';
import { validateNameAtom } from './settings';

export const getDevicesAtom = atom(null, (get) => {
  return get(devicesAtom);
});

export const startOrShutdownServerAtom = atom(
  null,
  async (get, set, checked?: boolean) => {
    const finalChecked = checked ?? !get(settingsAtom).server;
    if (finalChecked) {
      set(validateNameAtom);
    }
    const settings = get(settingsAtom);
    set(serverPendingAtom, true);
    try {
      if (finalChecked) {
        await ipc.startServer(settings);
      } else {
        await ipc.shutdownServer(settings.id);
        set(clearDeivcesAtom);
      }
      set(settingsAtom, (old) => ({ ...old, server: finalChecked }));
      updateServerItemChecked(finalChecked);
    } catch (error) {
      set(settingsAtom, (old) => ({ ...old, server: !finalChecked }));
      updateServerItemChecked(!finalChecked);
      throw error;
    } finally {
      set(serverPendingAtom, false);
    }
  },
);
