import { openUrl } from '@tauri-apps/plugin-opener';
import { useAtom } from 'jotai';
import { ExternalLink, Settings } from 'lucide-react';
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
import { useT } from '~/hooks';

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
        <div className="h-[200px] px-1">
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
          <div className="text-center mt-4">
            <div className="text-muted-foreground">
              {t('version')}: {PKG_VERSION}
            </div>
            <Button variant="link" onClick={() => openUrl(REPOSITORY_URL)}>
              {t('viewSourceCode')}
              <ExternalLink />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
