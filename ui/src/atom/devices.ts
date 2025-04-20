import { atom } from 'jotai';
import { devicesAtom } from './primitive';

export const getDevicesAtom = atom(null, (get) => {
  return get(devicesAtom);
});
