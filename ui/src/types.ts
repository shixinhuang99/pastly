export interface ThemeCfg {
  display: string;
  className: string;
}

export type ClipItemType = 'text' | 'image' | 'files';

export interface BaseClipItem<T extends ClipItemType, P> {
  id: string;
  type: T;
  value: P;
  date: number;
}

export type ClipItem =
  | BaseClipItem<'text', string>
  | BaseClipItem<'image', string>
  | BaseClipItem<'files', string[]>;
