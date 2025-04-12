import { Languages } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Select } from '~/components';
import { SelectIconTrigger } from '~/components/one-select';
import { Langs } from '~/consts';
import { storage } from '~/utils/storage';
import { SettingsDialog } from '~/views/settings';
import { ThemeToggle } from './theme-toggle';

export function AppHeader() {
  return (
    <div
      className="w-full h-11 flex justify-center items-center px-4 py-1 border-b border-border/50 dark:border-border relative"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-1 p-3">
        <img className="size-8" src="/icon.ico" alt="app logo icon" />
        <span className="font-serif text-lg">{PKG_NAME}</span>
      </div>
      <div className="flex items-center gap-1.5 absolute right-4">
        <ChangeLanguageButton />
        <ThemeToggle />
        <SettingsDialog />
      </div>
    </div>
  );
}

function ChangeLanguageButton() {
  const { i18n } = useTranslation();
  const [value, setValue] = useState(i18n.language);

  const handleLanguageChange = (v: string) => {
    setValue(v);
    i18n.changeLanguage(v);
    storage.setLanguage(v);
    document.documentElement.lang = v;
  };

  return (
    <Select
      trigger={
        <SelectIconTrigger>
          <Languages />
        </SelectIconTrigger>
      }
      value={value}
      onChange={handleLanguageChange}
      options={[
        { label: 'English', value: Langs.En },
        { label: '简体中文', value: Langs.Zh },
      ]}
    />
  );
}
