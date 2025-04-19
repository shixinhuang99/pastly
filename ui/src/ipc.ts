import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { DeviceInfo } from '~/types';

export const ipc = {
  getHostName(): Promise<string> {
    return invoke('get_host_name');
  },

  startServer(id: string, port: number, name: string) {
    return invoke('start_server', { id, port, name });
  },

  shutdownServer(id: string) {
    return invoke('shutdown_server', { id });
  },

  listenDeviceFound(fn: (device: DeviceInfo) => void) {
    listen<DeviceInfo>('device_found', (e) => {
      fn(e.payload);
    });
  },

  listenDeviceRemoved(fn: (id: string) => void) {
    listen<string>('device_removed', (e) => {
      fn(e.payload);
    });
  },
};
