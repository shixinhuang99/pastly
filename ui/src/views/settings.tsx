import { appConfigDir, appDataDir, join } from '@tauri-apps/api/path';
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import { useAtomValue, useSetAtom } from 'jotai';
import { SettingsIcon } from 'lucide-react';
import {
  ExternalLink,
  FolderOpen,
  LoaderCircle,
  Moon,
  Sun,
  Trash2,
  TvMinimal,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { deleteAllClipItemsAtom } from '~/atom/clip-items';
import {
  devicesAtom,
  hostNameAtom,
  serverPendingAtom,
  settingsAtom,
  themeAtom,
} from '~/atom/primitive';
import { startAndShutdownServerAtom } from '~/atom/server';
import {
  handleTrayToggleAutoStartAtom,
  initSettingsAtom,
  updateSettingsAtom,
  validateNameAtom,
} from '~/atom/settings';
import { applyMatchMediaAtom, initThemeAtom, setThemeAtom } from '~/atom/theme';
import {
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
import { storage } from '~/utils/storage';
import { changeTrayMenuLanguage } from '~/utils/tray';
import { Devices } from './devices';

export function SettingsDialog() {
  const settings = useAtomValue(settingsAtom);
  const updateSettings = useSetAtom(updateSettingsAtom);
  const t = useT();
  const initSettings = useSetAtom(initSettingsAtom);
  const handleTrayToggleAutoStart = useSetAtom(handleTrayToggleAutoStartAtom);
  const setDevices = useSetAtom(devicesAtom);
  const initTheme = useSetAtom(initThemeAtom);
  const applyMatchMedia = useSetAtom(applyMatchMediaAtom);

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
      handleTrayToggleAutoStart();
    });
    ipc.listenDeviceFound((device) => {
      setDevices((old) => [...old, device]);
    });
    ipc.listenDeviceRemoved((id) => {
      setDevices((old) => old.filter((item) => item.id !== id));
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
        className="w-[400px] rounded-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-left">
          <DialogTitle>{t('settings')}</DialogTitle>
          <DialogDescription>{t('applicationSettings')}</DialogDescription>
        </DialogHeader>
        <div
          className={cn(
            'h-[400px] px-3 overflow-y-auto overflow-x-hidden border-t',
            scrollBarCls(),
          )}
        >
          <Form value={settings} onChange={updateSettings}>
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
          <div className="flex flex-col items-center py-3">
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

function Title(props: { title: React.ReactNode }) {
  const { title } = props;

  return <div className="flex items-center justify-center gap-1">{title}</div>;
}

function AppearancesSettings() {
  const t = useT();
  const { i18n } = useTranslation();
  const [value, setValue] = useState(i18n.language);
  const theme = useAtomValue(themeAtom);
  const setTheme = useSetAtom(setThemeAtom);

  const handleLanguageChange = async (v: string) => {
    await i18n.changeLanguage(v);
    setValue(v);
    storage.setLanguage(v);
    document.documentElement.lang = v;
    await changeTrayMenuLanguage();
  };

  return (
    <>
      <Title title={t('appearances')} />
      <FormItemOnlyStyle label={t('language')}>
        <Select
          value={value}
          onChange={handleLanguageChange}
          options={[
            { label: 'English', value: Langs.En },
            { label: '简体中文', value: Langs.Zh },
          ]}
        />
      </FormItemOnlyStyle>
      <FormItemOnlyStyle label={t('theme')}>
        <Tabs value={theme.display} onValueChange={setTheme}>
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

  return (
    <>
      <Title title={t('general')} />
      <FormItem name="autoStart" label={t('autoStart')} comp="switch">
        <Switch />
      </FormItem>
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
    </>
  );
}

function SyncSettings() {
  const settings = useAtomValue(settingsAtom);
  const t = useT();
  const hostName = useAtomValue(hostNameAtom);
  const startAndShutdownServer = useSetAtom(startAndShutdownServerAtom);
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
          onCheckedChange={startAndShutdownServer}
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
