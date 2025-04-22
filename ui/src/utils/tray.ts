import {
  CheckMenuItem,
  Menu,
  MenuItem,
  PredefinedMenuItem,
} from '@tauri-apps/api/menu';
import { TrayIcon } from '@tauri-apps/api/tray';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { clear, writeText } from 'tauri-plugin-clipboard-api';
import { t } from '~/i18n';
import { ipc } from '~/ipc';
import type { DeviceInfo, Settings, TextClipItem } from '~/types';
import { jsonParse } from '~/utils/common';
import { emitter } from '~/utils/event-emitter';

let tray: TrayIcon | null = null;
let menu: Menu | null = null;

const PreDefMenuItemId = {
  NoData: 'noData',
  Clear: 'clear',
  ShowWindow: 'showWindow',
  Quit: 'quit',
  autoStart: 'autoStart',
  noConnections: 'noConnections',
  server: 'server',
} as const;

export async function initTrayMenu(clipItems: TextClipItem[]) {
  if (!tray) {
    tray = await TrayIcon.getById('main');
  }
  if (!menu && tray) {
    menu = await Menu.new({ id: 'trayMenu' });
  }
  if (!tray || !menu) {
    return;
  }
  const clipMenuItems = await createClipMenuItems(clipItems);
  if (clipMenuItems.length) {
    menu.append(clipMenuItems);
  }
  if (!clipItems.length) {
    const noDataItem = await MenuItem.new({
      id: PreDefMenuItemId.NoData,
      text: t('noData'),
      enabled: false,
    });
    await menu.append(noDataItem);
  }
  const speratorItem1 = await createSeprator();
  const noConnectionsItem = await MenuItem.new({
    id: PreDefMenuItemId.noConnections,
    text: t('noConnections'),
    enabled: false,
  });
  const speratorItem2 = await createSeprator();
  const settings = getSettings();
  const autoStartItem = await CheckMenuItem.new({
    id: PreDefMenuItemId.autoStart,
    text: t('autoStartTray'),
    checked: settings?.autoStart ?? false,
    accelerator: genAccelerator('Cmd+A'),
    action() {
      emitter.emit('toggle-auto-start');
    },
  });
  const serverItem = await CheckMenuItem.new({
    id: PreDefMenuItemId.server,
    text: t('server'),
    checked: settings?.server ?? false,
    accelerator: genAccelerator('Cmd+S'),
    action() {
      emitter.emit('toggle-server');
    },
  });
  const clearClipboardItem = await MenuItem.new({
    id: PreDefMenuItemId.Clear,
    text: t('clearClipboard'),
    accelerator: genAccelerator('Cmd+D'),
    async action() {
      await clear();
    },
  });
  const showWindowItem = await MenuItem.new({
    id: PreDefMenuItemId.ShowWindow,
    text: t('showWindow'),
    accelerator: genAccelerator('Cmd+W'),
    async action() {
      const ww = getCurrentWebviewWindow();
      await ww.show();
      await ww.setFocus();
    },
  });
  const quitItem = await MenuItem.new({
    id: PreDefMenuItemId.Quit,
    text: t('quit'),
    accelerator: genAccelerator('Cmd+Q'),
    async action() {
      const settings = getSettings();
      if (settings) {
        try {
          await ipc.shutdownServer(settings.id);
        } catch (_) {}
      }
      const ww = getCurrentWebviewWindow();
      await ww.destroy();
    },
  });
  await menu.append([
    speratorItem1,
    noConnectionsItem,
    speratorItem2,
    autoStartItem,
    serverItem,
    clearClipboardItem,
    showWindowItem,
    quitItem,
  ]);
  await tray.setMenu(menu);
}

async function createSeprator() {
  return PredefinedMenuItem.new({ item: 'Separator' });
}

function getSettings() {
  return jsonParse<Settings>(localStorage.getItem('settings'));
}

function genAccelerator(v?: string) {
  if (PLATFORM === 'win32' || PLATFORM === 'linux') {
    return undefined;
  }
  return v;
}

async function createClipMenuItems(
  clipItems: TextClipItem[],
): Promise<MenuItem[]> {
  let index = 1;
  const genClipItemAccelerator = () => {
    if (index < 1 || index > 10) {
      return undefined;
    }
    return `Cmd+${index === 10 ? 0 : index}`;
  };
  const items: MenuItem[] = [];
  window.__pastly.trayClipItemIds.clear();
  window.__pastly.trayCclipItemValueMap.clear();
  for (const clipItem of clipItems) {
    const item = await MenuItem.new({
      id: clipItem.id,
      text: clipItem.value.slice(0, 15),
      accelerator: genAccelerator(genClipItemAccelerator()),
      async action(id) {
        try {
          window.__pastly.copiedItemId = id;
          const value = window.__pastly.trayCclipItemValueMap.get(id);
          if (value) {
            await writeText(value);
          }
        } finally {
          window.__pastly.copiedItemId = '';
        }
      },
    });
    window.__pastly.trayClipItemIds.add(clipItem.id);
    window.__pastly.trayCclipItemValueMap.set(clipItem.id, clipItem.value);
    index += 1;
    items.push(item);
  }
  return items;
}

export async function changeTrayMenuLanguage() {
  if (!tray || !menu) {
    return;
  }
  const items = await menu.items();
  for (const item of items) {
    if (item.id === PreDefMenuItemId.NoData) {
      await item.setText(t('noData'));
    } else if (item.id === PreDefMenuItemId.Clear) {
      await item.setText(t('clearClipboard'));
    } else if (item.id === PreDefMenuItemId.ShowWindow) {
      await item.setText(t('showWindow'));
    } else if (item.id === PreDefMenuItemId.Quit) {
      await item.setText(t('quit'));
    } else if (item.id === PreDefMenuItemId.autoStart) {
      await item.setText(t('autoStart'));
    } else if (item.id === PreDefMenuItemId.noConnections) {
      await item.setText(t('noConnections'));
    } else if (item.id === PreDefMenuItemId.server) {
      await item.setText(t('server'));
    }
  }
}

export async function updateTrayClipItems(clipItems: TextClipItem[]) {
  if (!tray || !menu) {
    return;
  }
  const items = await menu.items();
  for (const item of items) {
    if (
      item.id === PreDefMenuItemId.NoData ||
      window.__pastly.trayClipItemIds.has(item.id)
    ) {
      await menu.remove(item);
    }
  }
  if (clipItems.length) {
    const clipMenuItems = await createClipMenuItems(clipItems);
    if (clipMenuItems.length) {
      menu.insert(clipMenuItems, 0);
    }
  } else {
    window.__pastly.trayClipItemIds.clear();
    window.__pastly.trayCclipItemValueMap.clear();
    const item = await menu.get(PreDefMenuItemId.NoData);
    if (item) {
      return;
    }
    const noDataItem = await MenuItem.new({
      id: PreDefMenuItemId.NoData,
      text: t('noData'),
      enabled: false,
    });
    await menu.insert(noDataItem, 0);
  }
}

export async function updateAutoStartItemChecked(v: boolean) {
  if (!tray || !menu) {
    return;
  }
  const autoStartItem = await menu.get(PreDefMenuItemId.autoStart);
  if (!autoStartItem) {
    return;
  }
  await (autoStartItem as CheckMenuItem).setChecked(v);
}

export async function updateServerItemChecked(v: boolean) {
  if (!tray || !menu) {
    return;
  }
  const serverItem = await menu.get(PreDefMenuItemId.server);
  if (!serverItem) {
    return;
  }
  await (serverItem as CheckMenuItem).setChecked(v);
}

function getDeviceItemInsertIdx() {
  const clipItemsCount = window.__pastly.trayClipItemIds.size;
  return clipItemsCount ? clipItemsCount + 1 : 2;
}

export async function addTrayDeviceItem(
  device: DeviceInfo,
  afterCount: number,
) {
  if (!tray || !menu) {
    return;
  }
  const idx = getDeviceItemInsertIdx();
  const deviceItem = await MenuItem.new({
    id: device.id,
    text: device.name.slice(0, 15),
    enabled: false,
  });
  await menu.insert(deviceItem, idx);
  if (afterCount === 1) {
    const item = await menu.get(PreDefMenuItemId.noConnections);
    if (item) {
      await menu.remove(item);
    }
  }
}

export async function removeTrayDeviceItem(ids: string[], afterCount: number) {
  if (!tray || !menu) {
    return;
  }
  for (const id of ids) {
    const item = await menu.get(id);
    if (item) {
      await menu.remove(item);
    }
  }
  if (afterCount === 0) {
    const item = await menu.get(PreDefMenuItemId.noConnections);
    if (item) {
      return;
    }
    const idx = getDeviceItemInsertIdx();
    const noConnectionsItem = await MenuItem.new({
      id: PreDefMenuItemId.noConnections,
      text: t('noConnections'),
      enabled: false,
    });
    await menu.insert(noConnectionsItem, idx);
  }
}
