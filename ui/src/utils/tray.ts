import {
  CheckMenuItem,
  Menu,
  MenuItem,
  PredefinedMenuItem,
} from '@tauri-apps/api/menu';
import { TrayIcon } from '@tauri-apps/api/tray';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import * as AutoStart from '@tauri-apps/plugin-autostart';
import { clear, writeText } from 'tauri-plugin-clipboard-api';
import { toastError } from '~/components';
import { t } from '~/i18n';
import { ipc } from '~/ipc';
import type { Settings, TextClipItem } from '~/types';
import { JsonParse } from '~/utils/common';
import { emitter } from '~/utils/event-emitter';

let tray: TrayIcon | null = null;
let menu: Menu | null = null;

const PreDefMenuItemId = {
  NoData: 'noData',
  Clear: 'clear',
  ShowWindow: 'showWindow',
  Quit: 'quit',
  autoStart: 'autoStart',
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
  menu.append(clipMenuItems);
  if (!clipItems.length) {
    const noDataItem = await MenuItem.new({
      id: PreDefMenuItemId.NoData,
      text: t('noData'),
      enabled: false,
    });
    await menu.append(noDataItem);
  }
  const speratorItem = await PredefinedMenuItem.new({ item: 'Separator' });
  const isAutoStartEnabled = await AutoStart.isEnabled();
  const autoStartItem = await CheckMenuItem.new({
    id: PreDefMenuItemId.autoStart,
    text: t('autoStartTray'),
    checked: isAutoStartEnabled,
    action() {
      emitter.emit('toggle-auto-start');
    },
  });
  const genAccelerator = (v: string) => {
    if (PLATFORM === 'win32' || PLATFORM === 'linux') {
      return undefined;
    }
    return v;
  };
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
      const settings = JsonParse<Settings>(localStorage.getItem('settings'));
      if (settings) {
        await ipc.shutdownServer(settings.id);
      }
      const ww = getCurrentWebviewWindow();
      await ww.destroy();
    },
  });
  await menu.append([
    speratorItem,
    autoStartItem,
    clearClipboardItem,
    showWindowItem,
    quitItem,
  ]);
  await tray.setMenu(menu);
}

async function createClipMenuItems(
  clipItems: TextClipItem[],
): Promise<MenuItem[]> {
  let index = 1;
  const genAccelerator = () => {
    if (index < 1 || index > 10 || PLATFORM === 'win32') {
      return undefined;
    }
    return `Cmd+${index === 10 ? 0 : index}`;
  };
  const items: MenuItem[] = [];
  window.__pastly.trayClipItemIds.clear();
  for (const clipItem of clipItems) {
    const item = await MenuItem.new({
      id: clipItem.id,
      text: clipItem.value.slice(0, 10),
      accelerator: genAccelerator(),
      async action(id) {
        try {
          window.__pastly.copiedItemId = id;
          await writeText(clipItem.value);
        } catch (error) {
          toastError(t('somethingWentWrong'), error);
          window.__pastly.copiedItemId = '';
        }
      },
    });
    window.__pastly.trayClipItemIds.add(clipItem.id);
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
    }
  }
}

export async function updateTrayMenuItems(clipItems: TextClipItem[]) {
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
    menu.insert(clipMenuItems, 0);
  } else {
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
