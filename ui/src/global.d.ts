import type { JustCopiedItem } from '~/types';

declare global {
  const PKG_NAME: string;
  const PKG_VERSION: string;
  const REPOSITORY_URL: string;
  const PLATFORM: 'darwin' | 'win32' | 'linux';
  interface Window {
    __pastly: {
      trayClipItemMap: Map<string, string>;
      justCopiedItem?: JustCopiedItem;
    };
  }
}
