import { format, formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { Langs } from '~/consts';
import type { ClipItem, TextClipItem } from '~/types';

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
  trayItemsCount: number,
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
