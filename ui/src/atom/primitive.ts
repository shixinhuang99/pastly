import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { Langs, Theme } from '~/consts';
import type { ClipItem, DeviceInfo, Settings } from '~/types';
import { getDefaultSettings } from '~/utils/common';

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
  getDefaultSettings(),
  undefined,
  { getOnInit: true },
);

export const hostNameAtom = atom('');

export const devicesAtom = atom<DeviceInfo[]>([]);

export const serverPendingAtom = atom(false);
