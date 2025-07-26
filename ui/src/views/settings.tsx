import { appConfigDir, appDataDir, join } from '@tauri-apps/api/path';
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { LoaderCircle, SettingsIcon, TimerReset } from 'lucide-react';
import {
  ExternalLink,
  FolderOpen,
  Moon,
  Sun,
  Trash2,
  TvMinimal,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteAllClipItemsAtom } from '~/atom/clip-items';
import { addDeviceAtom, removeDeviceAtom } from '~/atom/devices';
import { setLanguageAtom } from '~/atom/language';
import {
  hostNameAtom,
  languageAtom,
  serverPendingAtom,
  settingsAtom,
  themeAtom,
} from '~/atom/primitive';
import { startOrShutdownServerAtom } from '~/atom/server';
import {
  initSettingsAtom,
  resetSettingsAtom,
  toggleAutoStartAtom,
  toggleClipboardMonitoringAtom,
  validateNameAtom,
} from '~/atom/settings';
import { applyMatchMediaAtom, initThemeAtom, setThemeAtom } from '~/atom/theme';
import {
  AlertDialog,
  Button,
  HoverTip,
  Input,
  InputNumber,
  PINInput,
  Select,
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
import { Tabs, TabsList, TabsTrigger } from '~/components/shadcn/tabs';
import { Form, FormItem, FormItemOnlyStyle } from '~/components/simple-form';
import { DARK_MODE_MEDIA, DB_NAME, DEFAULT_PORT, Langs, Theme } from '~/consts';
import { useBoolean, useOnceEffect, useT } from '~/hooks';
import { ipc } from '~/ipc';
import { cn, scrollBarCls } from '~/utils/cn';
import { emitter } from '~/utils/event-emitter';
import { Devices } from './devices';

export function SettingsDialog() {
  const [settings, setSettings] = useAtom(settingsAtom);
  const t = useT();
  const initSettings = useSetAtom(initSettingsAtom);
  const toggleAutoStart = useSetAtom(toggleAutoStartAtom);
  const initTheme = useSetAtom(initThemeAtom);
  const applyMatchMedia = useSetAtom(applyMatchMediaAtom);
  const addDevice = useSetAtom(addDeviceAtom);
  const removeDevice = useSetAtom(removeDeviceAtom);
  const startOrShutdownServer = useSetAtom(startOrShutdownServerAtom);
  const toggleClipboardMonitoring = useSetAtom(toggleClipboardMonitoringAtom);

  useOnceEffect(() => {
    initTheme();
    const mql = window.matchMedia(DARK_MODE_MEDIA);
    applyMatchMedia(mql.matches);
    mql.addEventListener('change', (e) => {
      applyMatchMedia(e.matches);
    });
  });

  useOnceEffect(() => {
    initSettings();
    emitter.on('toggle-auto-start', () => {
      toggleAutoStart();
    });
    emitter.on('toggle-server', () => {
      startOrShutdownServer();
    });
    emitter.on('toggle-clipboard-monitoring', () => {
      toggleClipboardMonitoring();
    });
    ipc.listenDeviceFound((device) => {
      addDevice(device);
    });
    ipc.listenDeviceRemoved((id) => {
      removeDevice(id);
    });
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <TooltipButton tooltip={t('settings')}>
          <SettingsIcon />
        </TooltipButton>
      </DialogTrigger>
      <DialogContent
        className="w-[400px] rounded-lg p-0 gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-left p-6">
          <DialogTitle>{t('settings')}</DialogTitle>
          <DialogDescription>{t('applicationSettings')}</DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            'h-[400px] px-6 overflow-y-auto overflow-x-hidden border-t',
            scrollBarCls(),
          )}
        >
          <Form value={settings} onChange={setSettings}>
            <AppearancesSettings />
            <GeneralSettings />
            <SyncSettings />
          </Form>
          {settings.server && (
            <>
              <Title title={t('connections')} />
              <Devices className="border rounded mt-3" />
            </>
          )}
          <AppInfo />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Title(props: { title: React.ReactNode }) {
  const { title } = props;

  return <div className="flex items-center justify-center gap-1">{title}</div>;
}

function AppearancesSettings() {
  const t = useT();
  const { i18n } = useTranslation();
  const language = useAtomValue(languageAtom);
  const setLanguage = useSetAtom(setLanguageAtom);
  const theme = useAtomValue(themeAtom);
  const setTheme = useSetAtom(setThemeAtom);

  const handleLanguageChange = async (v: string) => {
    await i18n.changeLanguage(v);
    setLanguage(v);
  };

  return (
    <>
      <Title title={t('appearances')} />
      <FormItemOnlyStyle label={t('language')}>
        <Select
          value={language}
          onChange={handleLanguageChange}
          options={[
            { label: 'English', value: Langs.En },
            { label: '简体中文', value: Langs.Zh },
          ]}
        />
      </FormItemOnlyStyle>
      <FormItemOnlyStyle label={t('theme')}>
        <Tabs value={theme} onValueChange={setTheme}>
          <TabsList>
            <TabsTrigger value={Theme.Light}>
              <Sun className="size-4 mr-1" />
              {t('light')}
            </TabsTrigger>
            <TabsTrigger value={Theme.Dark}>
              <Moon className="size-4 mr-1" />
              {t('dark')}
            </TabsTrigger>
            <TabsTrigger value={Theme.System}>
              <TvMinimal className="size-4 mr-1" />
              {t('system')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </FormItemOnlyStyle>
    </>
  );
}

function GeneralSettings() {
  const t = useT();
  const toggleAutoStart = useSetAtom(toggleAutoStartAtom);
  const toggleClipboardMonitoring = useSetAtom(toggleClipboardMonitoringAtom);
  const settings = useAtomValue(settingsAtom);
  const autoStartPending = useBoolean();
  const clipboardPending = useBoolean();

  const handleAutoStartToggle = async (checked: boolean) => {
    try {
      autoStartPending.on();
      await toggleAutoStart(checked);
    } finally {
      autoStartPending.off();
    }
  };

  const handleClipboardMonitoringToggle = async (checked: boolean) => {
    try {
      clipboardPending.on();
      await toggleClipboardMonitoring(checked);
    } finally {
      clipboardPending.off();
    }
  };

  return (
    <>
      <Title title={t('general')} />
      <FormItemOnlyStyle label={t('autoStart')}>
        <Switch
          checked={settings.autoStart}
          onCheckedChange={handleAutoStartToggle}
          disabled={autoStartPending.value}
        />
      </FormItemOnlyStyle>
      <FormItemOnlyStyle label={t('monitorClipboard')}>
        <Switch
          checked={settings.clipboardListening}
          onCheckedChange={handleClipboardMonitoringToggle}
          disabled={clipboardPending.value}
        />
      </FormItemOnlyStyle>
    </>
  );
}

function SyncSettings() {
  const settings = useAtomValue(settingsAtom);
  const t = useT();
  const hostName = useAtomValue(hostNameAtom);
  const startOrShutdownServer = useSetAtom(startOrShutdownServerAtom);
  const serverPending = useAtomValue(serverPendingAtom);
  const validateName = useSetAtom(validateNameAtom);

  useOnceEffect(() => {
    validateName();
  });

  return (
    <>
      <Title
        title={
          <>
            {t('sync')}
            <HoverTip text={t('sycnTip')} />
          </>
        }
      />
      <FormItemOnlyStyle label={t('server')}>
        <Switch
          checked={settings.server}
          onCheckedChange={startOrShutdownServer}
          disabled={serverPending}
        />
      </FormItemOnlyStyle>
      <FormItemOnlyStyle label={t('id')}>
        <Input value={settings.id} disabled />
      </FormItemOnlyStyle>
      <FormItem name="name" label={t('name')} comp="input">
        <Input maxLength={30} placeholder={hostName} onBlur={validateName} />
      </FormItem>
      <FormItem name="port" label={t('port')} comp="input-number">
        <InputNumber
          minValue={1024}
          maxValue={49151}
          placeholder={DEFAULT_PORT.toString()}
        />
      </FormItem>
      <FormItem
        name="pin"
        label={
          <>
            {t('pin')}
            <HoverTip className="mx-1" text={t('pinTip')} />
          </>
        }
        comp="input"
      >
        <PINInput maxLength={4} placeholder={t('pinPlaceholder')} />
      </FormItem>
    </>
  );
}

function AppInfo() {
  const t = useT();

  return (
    <div className="flex flex-col items-center py-3">
      <div className="text-muted-foreground h-9 flex items-center">
        {t('version')}: {PKG_VERSION}
      </div>
      <DeleteAllClipItemsButton />
      <ResetSettingsButton />
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
  );
}

function DeleteAllClipItemsButton() {
  const t = useT();
  const deleteAllClipItems = useSetAtom(deleteAllClipItemsAtom);
  const pending = useBoolean();
  const open = useBoolean();

  const handleClick = async () => {
    try {
      pending.on();
      await deleteAllClipItems();
    } finally {
      pending.off();
      open.off();
    }
  };

  return (
    <AlertDialog
      title={t('deleteAllClipItemsConfirmTitle')}
      description={t('deleteAllClipItemsConfirmDesc')}
      open={open.value}
      onOpenChange={open.set}
      onOk={handleClick}
      okLoading={pending.value}
    >
      <Button className="text-red-500" variant="link">
        {t('deleteAllClipItems')}
        <Trash2 />
      </Button>
    </AlertDialog>
  );
}

function ResetSettingsButton() {
  const t = useT();
  const resetSettings = useSetAtom(resetSettingsAtom);
  const pending = useBoolean();

  const handleClick = async () => {
    try {
      pending.on();
      await resetSettings();
    } finally {
      pending.off();
    }
  };

  return (
    <Button variant="link" onClick={handleClick}>
      {t('resetSettings')}
      {pending.value ? (
        <LoaderCircle className="animate-spin" />
      ) : (
        <TimerReset />
      )}
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
