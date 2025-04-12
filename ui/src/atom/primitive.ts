import { atom } from 'jotai';
import type { ClipItem, ThemeCfg } from '~/types';

export const themeAtom = atom<ThemeCfg>({
  display: '',
  className: '',
});

export const clipItemsAtom = atom<ClipItem[]>([]);

export const writeToClipboardPendingAtom = atom(false);
