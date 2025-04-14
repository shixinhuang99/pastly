import { format, formatDistanceToNow } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { Langs } from '~/consts';
import type { ClipItem, TextClipItem } from '~/types';

export function fmtDate(v: number): string {
  return format(v, 'yyyy/MM/dd HH:mm:ss');
}

export function fmtDateDistance(v: number, locale: string): string {
  return formatDistanceToNow(v, {
    addSuffix: true,
    locale: i18nLangToDateFnsLang(locale),
  });
}

function i18nLangToDateFnsLang(lang: string) {
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
