import { appDataDir, join } from '@tauri-apps/api/path';
import { openUrl, revealItemInDir } from '@tauri-apps/plugin-opener';
import { useAtom, useSetAtom } from 'jotai';
import { Settings } from 'lucide-react';
import { ExternalLink, FolderOpen, LoaderCircle, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { deleteAllClipItemsAtom } from '~/atom/clip-items';
import { settingsAtom } from '~/atom/primitive';
import { Button, InputNumber, TooltipButton } from '~/components';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/shadcn/dialog';
import { Form, FormItem } from '~/components/simple-form';
import { DB_NAME } from '~/consts';
import { useBoolean, useOnceEffect, useT } from '~/hooks';

export function SettingsDialog() {
  const [settings, setSettings] = useAtom(settingsAtom);
  const t = useT();

  const handleSettingsChange = (v: Record<string, any>) => {
    setSettings((old) => ({ ...old, ...v }));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <TooltipButton tooltip={t('settings')}>
          <Settings />
        </TooltipButton>
      </DialogTrigger>
      <DialogContent className="w-[400px] rounded-lg">
        <DialogHeader className="text-left">
          <DialogTitle>{t('settings')}</DialogTitle>
          <DialogDescription>{t('applicationSettings')}</DialogDescription>
        </DialogHeader>
        <div className="h-[270px] px-1">
          <Form value={settings} onChange={handleSettingsChange}>
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
          </Form>
          <div className="mt-4 flex flex-col items-center">
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
    const dir = await appDataDir();
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
