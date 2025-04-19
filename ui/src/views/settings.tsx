import { appConfigDir, appDataDir, join } from '@tauri-apps/api/path';
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { SettingsIcon } from 'lucide-react';
import {
  Computer,
  ExternalLink,
  FolderOpen,
  IdCard,
  LoaderCircle,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { deleteAllClipItemsAtom } from '~/atom/clip-items';
import { devicesAtom, hostNameAtom, settingsAtom } from '~/atom/primitive';
import {
  handleTrayToggleAutoStartAtom,
  initSettingsAtom,
  updateSettingsAtom,
} from '~/atom/settings';
import {
  Button,
  Input,
  InputNumber,
  Switch,
  TooltipButton,
} from '~/components';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/shadcn/dialog';
import { Form, FormItem, FormItemOnlyStyle } from '~/components/simple-form';
import { DB_NAME } from '~/consts';
import { useBoolean, useOnceEffect, useT } from '~/hooks';
import { ipc } from '~/ipc';
import { cardBgCls, cn, scrollBarCls } from '~/utils/cn';
import { emitter } from '~/utils/event-emitter';

export function SettingsDialog() {
  const [settings, setSettings] = useAtom(settingsAtom);
  const updateSettings = useSetAtom(updateSettingsAtom);
  const t = useT();
  const initSettings = useSetAtom(initSettingsAtom);
  const handleTrayToggleAutoStart = useSetAtom(handleTrayToggleAutoStartAtom);
  const serverPending = useBoolean();
  const hostName = useAtomValue(hostNameAtom);
  const setDevices = useSetAtom(devicesAtom);

  useOnceEffect(() => {
    initSettings();
    emitter.on('toggle-auto-start', () => {
      handleTrayToggleAutoStart();
    });
    ipc.listenDeviceFound((device) => {
      setDevices((old) => [...old, device]);
    });
    ipc.listenDeviceRemoved((id) => {
      setDevices((old) => old.filter((item) => item.id !== id));
    });
  });

  const handleServerSwitch = async (checked: boolean) => {
    serverPending.on();
    try {
      if (checked) {
        await ipc.startServer(settings.id, settings.port, settings.name);
      } else {
        await ipc.shutdownServer(settings.id);
        setDevices([]);
      }
      setSettings({ ...settings, server: checked });
    } finally {
      serverPending.off();
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <TooltipButton tooltip={t('settings')}>
          <SettingsIcon />
        </TooltipButton>
      </DialogTrigger>
      <DialogContent
        className="w-[400px] rounded-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-left">
          <DialogTitle>{t('settings')}</DialogTitle>
          <DialogDescription>{t('applicationSettings')}</DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            'h-[310px] px-3 overflow-y-auto overflow-x-hidden border-t',
            scrollBarCls(),
          )}
        >
          <Form value={settings} onChange={updateSettings}>
            <Title title={t('general')} />
            <FormItem
              name="maxItemsCount"
              label={t('maxItemsCount')}
              comp="input-number"
            >
              <InputNumber minValue={1} maxValue={99999} />
            </FormItem>
            <FormItem
              name="trayItemsCount"
              label={t('trayItemsCount')}
              comp="input-number"
            >
              <InputNumber minValue={1} maxValue={30} />
            </FormItem>
            <FormItem name="autoStart" label={t('autoStart')} comp="switch">
              <Switch />
            </FormItem>
            <Title title={t('sync')} />
            <FormItemOnlyStyle label={t('server')}>
              <Switch
                checked={settings.server}
                onCheckedChange={handleServerSwitch}
                disabled={serverPending.value}
              />
            </FormItemOnlyStyle>
            <FormItemOnlyStyle label={t('id')}>
              <Input value={settings.id} disabled />
            </FormItemOnlyStyle>
            <FormItem name="name" label={t('name')} comp="input">
              <Input
                minLength={1}
                maxLength={30}
                placeholder={hostName}
                onBlur={() => {
                  if (!settings.name.trim().length) {
                    setSettings({ ...settings, name: hostName });
                  }
                }}
              />
            </FormItem>
            <FormItem name="port" label={t('port')} comp="input-number">
              <InputNumber minValue={1024} maxValue={49151} />
            </FormItem>
          </Form>
          <DeviceList />
          <div className="mt-1 flex flex-col items-center">
            <div className="text-muted-foreground h-9 flex items-center">
              {t('version')}: {PKG_VERSION}
            </div>
            <DeleteAllClipItemsButton />
            <OpenDatabaseDirButton />
            <Button
              variant="link"
              onClick={() => openUrl(REPOSITORY_URL)}
              title={REPOSITORY_URL}
            >
              {t('viewSourceCode')}
              <ExternalLink />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteAllClipItemsButton() {
  const t = useT();
  const deleteAllClipItems = useSetAtom(deleteAllClipItemsAtom);
  const pending = useBoolean();

  const handleClick = async () => {
    try {
      pending.on();
      await deleteAllClipItems();
    } finally {
      pending.off();
    }
  };

  return (
    <Button
      className="text-red-500"
      variant="link"
      onClick={handleClick}
      disabled={pending.value}
    >
      {t('deleteAllClipItems')}
      {pending.value ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}

function OpenDatabaseDirButton() {
  const t = useT();
  const [dbPath, setDbPath] = useState<string | null>(null);

  useOnceEffect(async () => {
    const dir =
      PLATFORM === 'linux' ? await appConfigDir() : await appDataDir();
    const path = await join(dir, DB_NAME);
    setDbPath(path);
  });

  const handleClick = () => {
    if (!dbPath) {
      return;
    }
    revealItemInDir(dbPath);
  };

  return (
    <Button
      variant="link"
      onClick={handleClick}
      disabled={!dbPath}
      title={dbPath ?? undefined}
    >
      {t('openDatabaseDir')}
      <FolderOpen />
    </Button>
  );
}

function Title(props: { title: string }) {
  const { title } = props;

  return <div className="text-center text-lg">{title}</div>;
}

function DeviceList() {
  const devices = useAtomValue(devicesAtom);
  const t = useT();

  if (!devices.length) {
    return null;
  }

  return (
    <>
      <Title title={t('connections')} />
      <div className="w-full border rounded p-2 mt-3 flex flex-col gap-2">
        {devices.map((device) => {
          return (
            <div
              key={device.id}
              className={cn('rounded py-1 px-3', cardBgCls())}
            >
              <div className="flex items-center gap-2">
                <Computer className="size-4" />
                <span className="truncate flex-1" title={device.name}>
                  {device.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <IdCard className="size-4" />
                <span className="text-muted-foreground">{device.id}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
