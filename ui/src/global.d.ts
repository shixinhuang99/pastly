declare const PKG_NAME: string;
declare const PKG_VERSION: string;
declare const REPOSITORY_URL: string;
declare const PLATFORM: 'darwin' | 'win32' | 'linux';
// biome-ignore lint/correctness/noUnusedVariables: <explanation>
interface Window {
  __pastly: {
    copiedItemId: string;
    trayClipItemIds: Set<string>;
    trayCclipItemValueMap: Map<string, string>;
  };
}
