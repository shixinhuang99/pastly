import { atom } from 'jotai';
import type { DeviceInfo } from '~/types';
import { addTrayDeviceItem, removeTrayDeviceItem } from '~/utils/tray';
import { devicesAtom } from './primitive';

export const addDeviceAtom = atom(null, (get, set, device: DeviceInfo) => {
  const devices = get(devicesAtom);
  if (devices.some((item) => item.id === device.id)) {
    return;
  }
  const newDevices = [...devices, device];
  set(devicesAtom, newDevices);
  addTrayDeviceItem(device, newDevices.length);
});

export const removeDeviceAtom = atom(null, (get, set, id: string) => {
  const devices = get(devicesAtom);
  const newDevices = devices.filter((item) => item.id !== id);
  set(devicesAtom, newDevices);
  removeTrayDeviceItem([id], newDevices.length);
});

export const clearDeivcesAtom = atom(null, (get, set) => {
  const devices = get(devicesAtom);
  removeTrayDeviceItem(
    devices.map((item) => item.id),
    0,
  );
  set(devicesAtom, []);
});
