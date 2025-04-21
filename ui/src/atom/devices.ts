import { atom } from 'jotai';
import type { DeviceInfo } from '~/types';
import { devicesAtom } from './primitive';

export const addDeviceAtom = atom(null, (get, set, device: DeviceInfo) => {
  const devices = get(devicesAtom);
  if (devices.some((item) => item.id === device.id)) {
    return;
  }
  set(devicesAtom, [...devices, device]);
});

export const removeDeviceAtom = atom(null, (get, set, id: string) => {
  const devices = get(devicesAtom);
  set(
    devicesAtom,
    devices.filter((item) => item.id !== id),
  );
});
