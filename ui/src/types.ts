export interface ThemeCfg {
  display: string;
  className: string;
}

export type ClipItemTypes = 'text' | 'image' | 'files';

export interface BaseClipItem<T extends ClipItemTypes, P> {
  id: string;
  type: T;
  value: P;
  date: number;
}

export type TextClipItem = BaseClipItem<'text', string>;

export type ClipItem =
  | TextClipItem
  | BaseClipItem<'image', string>
  | BaseClipItem<'files', string[]>;

export interface Settings {
  maxItemsCount: number;
  trayItemsCount: number;
}

export type ClipItemDBSchema = {
  id: string;
  type: ClipItemTypes;
  value: string;
  date: number;
};
