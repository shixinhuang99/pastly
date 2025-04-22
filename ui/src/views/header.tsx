import { useAtomValue, useSetAtom } from 'jotai';
import { Loader, Radio, Wifi, WifiOff } from 'lucide-react';
import { devicesAtom, serverPendingAtom, settingsAtom } from '~/atom/primitive';
import { startOrShutdownServerAtom } from '~/atom/server';
import { Button, TooltipButton } from '~/components';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/shadcn/popover';
import { useT } from '~/hooks';
import { cn } from '~/utils/cn';
import { Devices } from './devices';
import { SettingsDialog } from './settings';

export function Header() {
  return (
    <div
      className={cn(
        'w-full h-11 flex items-center px-4 py-1 border-b border-border/50 dark:border-border',
        PLATFORM === 'darwin' ? 'justify-center relative' : 'justify-between',
      )}
      data-tauri-drag-region={PLATFORM === 'darwin' ? true : undefined}
    >
      <div className="flex items-center gap-1">
        <img className="size-8" src="/icon.ico" alt="app logo icon" />
        <span className="font-serif text-lg">{PKG_NAME}</span>
      </div>
      <div
        className={cn(
          'flex items-center gap-1.5',
          PLATFORM === 'darwin' && 'absolute right-4',
        )}
      >
        <ServerSwtich />
        <SettingsDialog />
      </div>
    </div>
  );
}

function ServerSwtich() {
  const t = useT();
  const settings = useAtomValue(settingsAtom);
  const devices = useAtomValue(devicesAtom);
  const startOrShutdownServer = useSetAtom(startOrShutdownServerAtom);
  const serverPending = useAtomValue(serverPendingAtom);

  return (
    <>
      {serverPending ? (
        <Button variant="ghost" size="icon">
          <Loader className="animate-spin" />
        </Button>
      ) : (
        <TooltipButton
          tooltip={settings.server ? t('shutdownServer') : t('startServer')}
          onClick={() => startOrShutdownServer(!settings.server)}
        >
          {settings.server ? <Wifi /> : <WifiOff />}
        </TooltipButton>
      )}
      {settings.server && !serverPending && (
        <Popover>
          <PopoverTrigger asChild>
            <TooltipButton className="relative" tooltip={t('connections')}>
              <Radio className="text-green-600" />
              <span className="text-green-600">{devices.length}</span>
            </TooltipButton>
          </PopoverTrigger>
          <PopoverContent className="p-0">
            <Devices />
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
