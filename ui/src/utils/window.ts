import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';

export function setupWindow() {
  const ww = getCurrentWebviewWindow();
  ww.onCloseRequested(async (e) => {
    e.preventDefault();
    await ww.hide();
  });
}
