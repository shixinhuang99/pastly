export interface ThemeCfg {
  display: string;
  className: string;
}

export interface BaseClipItem<T extends string, P> {
  type: T;
  value: P;
  date: number;
}

export type ClipItem =
  | BaseClipItem<'text', string>
  | BaseClipItem<'image', string>
  | BaseClipItem<'files', string[]>;
