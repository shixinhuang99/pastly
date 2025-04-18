import { invoke } from '@tauri-apps/api/core';

export const ipc = {
  getHostName(): Promise<string> {
    return invoke('get_host_name');
  },

  startServer(id: string, port: number, name: string) {
    return invoke('start_server', { id, port, name });
  },

  shutdownServer() {
    return invoke('shutdown_server');
  },
};
