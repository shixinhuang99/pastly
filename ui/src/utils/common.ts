import { format, formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { DEFAULT_PORT, Langs, UNKNOWN_NAME } from '~/consts';
import type { ClipItem, Settings, TextClipItem } from '~/types';

export function fmtFullDate(v: number): string {
  return format(v, 'yyyy/MM/dd HH:mm:ss');
}

export function fmtDateDistance(v: number, lang: string): string {
  return formatDistanceToNow(v, {
    addSuffix: true,
    locale: getDateFnsLocaleFromI18nLang(lang),
  });
}

export function fmtShortDate(v: Date, lang: string) {
  return format(v, 'PP', { locale: getDateFnsLocaleFromI18nLang(lang) });
}

export function getDateFnsLocaleFromI18nLang(lang: string) {
  if (lang === Langs.Zh) {
    return zhCN;
  }
  return enUS;
}

export function collectTrayClipItems(
  clipItems: ClipItem[],
  trayItemsCount = 10,
) {
  const result: TextClipItem[] = [];
  for (const item of clipItems) {
    if (item.type !== 'text') {
      continue;
    }
    result.push(item);
    if (result.length >= trayItemsCount) {
      break;
    }
  }
  return result;
}

export function jsonParse<T>(str: string | null | undefined): T | null {
  if (!str) {
    return null;
  }
  try {
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
}

export function getDefaultSettings(): Settings {
  return {
    autoStart: false,
    server: false,
    id: crypto.randomUUID().slice(0, 8),
    name: UNKNOWN_NAME,
    port: DEFAULT_PORT,
    pin: '',
  };
}

export function isJustCopiedItem(item: ClipItem) {
  const distance = item.type === 'image' ? 15000 : 5000;
  return (
    !!window.__pastly.justCopiedItem &&
    window.__pastly.justCopiedItem.value === item.value.toString() &&
    window.__pastly.justCopiedItem.timestamp < item.date &&
    item.date - window.__pastly.justCopiedItem.timestamp <= distance
  );
}
