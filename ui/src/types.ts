export type ClipItemTypes = 'text' | 'image' | 'files';

export interface BaseClipItem<T extends ClipItemTypes, P> {
  id: string;
  type: T;
  value: P;
  date: number;
}

export type TextClipItem = BaseClipItem<'text', string>;

export type ImageClipItem = BaseClipItem<'image', string>;

export type FilesClipItem = BaseClipItem<'files', string[]>;

export type ClipItem = TextClipItem | ImageClipItem | FilesClipItem;

export interface Settings {
  autoStart: boolean;
  server: boolean;
  id: string;
  name: string;
  port: number;
  pin: string;
}

export interface ClipItemDBSchema {
  id: string;
  type: ClipItemTypes;
  value: string;
  date: number;
}

export interface DeviceInfo {
  id: string;
  name: string;
  ip: string;
  port: number;
  pin_hash?: string;
}

export interface ClipboardSync {
  kind: Exclude<ClipItemTypes, 'files'>;
  value: string;
}

export interface JustCopiedItem {
  value: string;
  timestamp: number;
}

export interface ClipImage {
  id: string;
  value: string;
}
