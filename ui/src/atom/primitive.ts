import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { DEFAULT_PORT, Langs, Theme, UNKNOWN_NAME } from '~/consts';
import type { ClipItem, DeviceInfo, Settings } from '~/types';

export const themeAtom = atomWithStorage<string>(
  'theme',
  Theme.System,
  undefined,
  {
    getOnInit: true,
  },
);

export const languageAtom = atomWithStorage<string>(
  'language',
  Langs.En,
  undefined,
  { getOnInit: true },
);

export const clipItemsAtom = atom<ClipItem[]>([]);

export const writeToClipboardPendingAtom = atom(false);

export const settingsAtom = atomWithStorage<Settings>(
  'settings',
  {
    maxItemsCount: 50000,
    trayItemsCount: 10,
    autoStart: false,
    server: false,
    id: crypto.randomUUID().slice(0, 8),
    name: UNKNOWN_NAME,
    port: DEFAULT_PORT,
  },
  undefined,
  { getOnInit: true },
);

export const hostNameAtom = atom('');

export const devicesAtom = atom<DeviceInfo[]>([]);

export const serverPendingAtom = atom(false);
