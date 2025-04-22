import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
  ClipboardSync,
  DeviceInfo,
  ImageClipItem,
  Settings,
  TextClipItem,
} from '~/types';

export const ipc = {
  getHostName(): Promise<string> {
    return invoke('get_host_name');
  },

  startServer(settings: Settings) {
    const { id, port, name, pin } = settings;
    return invoke('start_server', {
      id,
      port,
      name,
      pin: pin.trim().length ? pin : undefined,
    });
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

  broadcastClipboardSync(
    clipItem: TextClipItem | ImageClipItem,
    devices: DeviceInfo[],
  ) {
    return invoke('broadcast_clipboard_sync', {
      clipItem: {
        kind: clipItem.type,
        value: clipItem.value,
        iv: '',
      },
      devices,
    });
  },

  listenClipboardSync(fn: (v: ClipboardSync) => void) {
    listen<ClipboardSync>('clipboard_sync', (e) => {
      fn(e.payload);
    });
  },
};
