import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { ClipItem, Settings, ThemeCfg } from '~/types';

export const themeAtom = atom<ThemeCfg>({
  display: '',
  className: '',
});

export const clipItemsAtom = atom<ClipItem[]>([]);

export const writeToClipboardPendingAtom = atom(false);

export const settingsAtom = atomWithStorage<Settings>(
  'settings',
  {
    maxItemsCount: 10000,
    trayItemsCount: 10,
    autoStart: false,
    server: false,
    id: crypto.randomUUID().slice(0, 8),
    name: '',
    port: 42513,
  },
  undefined,
  { getOnInit: true },
);

export const hostNameAtom = atom('');
