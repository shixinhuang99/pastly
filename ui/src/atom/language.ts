import { atom } from 'jotai';
import { changeTrayMenuLanguage } from '~/utils/tray';
import { languageAtom } from './primitive';

export const setLanguageAtom = atom(null, (_, set, v: string) => {
  set(languageAtom, v);
  document.documentElement.lang = v;
  changeTrayMenuLanguage();
});
