import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { atom } from 'jotai';
import { DARK_MODE_MEDIA, Theme } from '~/consts';
import { storage } from '~/utils/storage';
import { themeAtom } from './primitive';

function isSystemDark() {
  return window.matchMedia(DARK_MODE_MEDIA).matches;
}

function setTheme(theme: string) {
  if (!isTauri()) {
    return;
  }
  const ww = getCurrentWebviewWindow();
  if (theme === Theme.Light || theme === Theme.Dark) {
    ww.setTheme(theme);
  } else {
    ww.setTheme(null);
  }
}

function applyTheme(theme: string) {
  let finalTheme = theme;
  if (theme === Theme.System) {
    finalTheme = isSystemDark() ? Theme.Dark : Theme.Light;
  }
  const root = window.document.documentElement;
  root.classList.remove(Theme.Light, Theme.Dark);
  root.classList.add(finalTheme);
  return finalTheme;
}

export const initThemeAtom = atom(null, (_, set) => {
  const theme = storage.getTheme();
  const className = applyTheme(theme);
  set(themeAtom, { display: theme, className });
  setTheme(theme);
});

export const applyMatchMediaAtom = atom(null, (get, set, matches: boolean) => {
  const display = get(themeAtom).display;
  if (display !== Theme.System) {
    return;
  }
  const theme = matches ? Theme.Dark : Theme.Light;
  const newClassName = applyTheme(theme);
  set(themeAtom, { display, className: newClassName });
  setTheme(display);
});

export const setThemeAtom = atom(null, (get, set, choose: string) => {
  const display = get(themeAtom).display;
  if (display === choose) {
    return;
  }
  const newClassName = applyTheme(choose);
  set(themeAtom, { display: choose, className: newClassName });
  storage.setTheme(choose);
  setTheme(choose);
});
