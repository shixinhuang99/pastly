import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { isSameDay } from 'date-fns';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Copy, FolderOpen, LoaderCircle, Trash2 } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type UpdatedTypes,
  onSomethingUpdate,
  readFiles,
  readImageBase64,
  readText,
  startListening,
  writeFiles,
  writeImageBase64,
  writeText,
} from 'tauri-plugin-clipboard-api';
import {
  addClipItemAtom,
  deleteClipItemAtom,
  initClipItemsAtom,
  updateClipItemAtom,
} from '~/atom/clip-items';
import { getDevicesAtom } from '~/atom/devices';
import { clipItemsAtom, writeToClipboardPendingAtom } from '~/atom/primitive';
import {
  Button,
  SearchInput,
  Textarea,
  TooltipButton,
  toastError,
} from '~/components';
import { DatePicker } from '~/components/date-picker';
import { VirtualList, type VirtualListRef } from '~/components/virtual-list';
import { useBoolean, useOnceEffect, useT } from '~/hooks';
import { ipc } from '~/ipc';
import type {
  BaseClipItem,
  ClipItem,
  ClipItemTypes,
  ClipboardSync,
} from '~/types';
import { cardBgCls, cn, scrollBarCls } from '~/utils/cn';
import { fmtDateDistance, fmtFullDate } from '~/utils/common';

function createClipItem<T extends ClipItemTypes, P>(
  type: T,
  value: P,
): BaseClipItem<T, P> {
  return {
    id: crypto.randomUUID(),
    type,
    value,
    date: Date.now(),
  };
}

export function List() {
  const clipItems = useAtomValue(clipItemsAtom);
  const addClipItem = useSetAtom(addClipItemAtom);
  const initClipItems = useSetAtom(initClipItemsAtom);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const t = useT();
  const setWriteToClipboardPending = useSetAtom(writeToClipboardPendingAtom);
  const virtualListRef = useRef<VirtualListRef>(null);
  const loading = useBoolean();
  const [date, setDate] = useState<Date>();
  const getDevices = useSetAtom(getDevicesAtom);

  useOnceEffect(async () => {
    onSomethingUpdate(async (updateTypes: UpdatedTypes) => {
      let newClipItem: ClipItem | null = null;
      if (updateTypes.files && PLATFORM !== 'linux') {
        const files = await readFiles();
        newClipItem = createClipItem('files', files);
      } else if (updateTypes.image) {
        const image = await readImageBase64();
        newClipItem = createClipItem('image', image);
      } else if (updateTypes.text) {
        const text = await readText();
        newClipItem = createClipItem('text', text);
      }
      if (!newClipItem) {
        return;
      }
      addClipItem(newClipItem, window.__pastly.copiedItemId);
      if (!window.__pastly.copiedItemId) {
        virtualListRef.current?.scrollToTop();
      }
      setWriteToClipboardPending(false);
      window.__pastly.copiedItemId = '';
      if (newClipItem.type !== 'files') {
        ipc.broadcastClipboardSync(newClipItem, getDevices());
      }
    });
    ipc.listenClipboardSync((clipboardSync: ClipboardSync) => {
      addClipItem(createClipItem(clipboardSync.kind, clipboardSync.value));
    });
    try {
      loading.on();
      await initClipItems();
      await startListening();
    } finally {
      loading.off();
    }
  });

  const filteredClipItems = useMemo(() => {
    let result = clipItems;
    if (date) {
      result = result.filter((item) => isSameDay(date, item.date));
    }
    if (deferredSearch) {
      result = result.filter((item) => {
        if (item.type === 'text') {
          return item.value.includes(deferredSearch);
        }
        if (item.type === 'files') {
          return item.value.some((file) => file.includes(deferredSearch));
        }
        return false;
      });
    }
    return result;
  }, [deferredSearch, clipItems, date]);

  const clipItemDates = useMemo(() => {
    return clipItems.map((item) => item.date);
  }, [clipItems]);

  if (loading.value) {
    return (
      <div className="h-full w-full flex justify-center items-center">
        <LoaderCircle className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="pl-4 pr-6 py-2 flex items-center gap-2">
        <SearchInput
          className="flex-1"
          value={search}
          onValueChange={setSearch}
          placeholder={t('searchByKeyword')}
        />
        <DatePicker
          value={date}
          onChange={setDate}
          shouldDisabled={(v) => {
            return !clipItemDates.some((vv) => isSameDay(vv, v));
          }}
        />
        <div>{t('itemsCount', { count: filteredClipItems.length })}</div>
      </div>
      <VirtualList
        ref={virtualListRef}
        className="flex-1 h-px"
        data={filteredClipItems}
        estimateSize={250}
        renderItem={(item) => {
          return <Item clipItem={item} />;
        }}
      />
    </>
  );
}

function Item(props: { clipItem: ClipItem }) {
  const { clipItem } = props;

  const t = useT();
  const [writeToClipboardPending, setWriteToClipboardPending] = useAtom(
    writeToClipboardPendingAtom,
  );
  const deleteClipItem = useSetAtom(deleteClipItemAtom);
  const updateClipItem = useSetAtom(updateClipItemAtom);

  const { id, type, value, date } = clipItem;
  const fullDate = fmtFullDate(date);

  const handleReealInDirError = (path: string) => {
    if (type !== 'files') {
      return;
    }
    const newFiles = value.filter((file) => file !== path);
    if (newFiles.length === 0) {
      deleteClipItem(clipItem.id);
      return;
    }
    updateClipItem({ ...clipItem, value: newFiles });
  };

  const handleCopy = async () => {
    try {
      window.__pastly.copiedItemId = id;
      setWriteToClipboardPending(true);
      if (type === 'text') {
        await writeText(value);
      } else if (type === 'image') {
        await writeImageBase64(value);
      } else if (type === 'files') {
        await writeFiles(value);
      }
    } catch (error) {
      toastError(t('somethingWentWrong'), error);
      window.__pastly.copiedItemId = '';
      setWriteToClipboardPending(false);
    }
  };

  return (
    <div className="h-full w-full px-4 py-2">
      <div className="h-full w-full flex flex-col rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div
          className={cn(
            'h-[50px] rounded-tl-lg rounded-tr-lg flex justify-between items-center px-4 text-background',
            type === 'text' && 'bg-yellow-500',
            type === 'image' && 'bg-green-500',
            type === 'files' && 'bg-cyan-500',
          )}
        >
          <div>
            <div className="text-lg font-semibold">{t(type)}</div>
            <DateDistanceDisplay date={date} fullDate={fullDate} />
          </div>
          <div>
            <ItemActionButton
              type={type}
              onClick={handleCopy}
              disabled={writeToClipboardPending}
            >
              {writeToClipboardPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Copy className="text-background" />
              )}
            </ItemActionButton>
            <ItemActionButton
              type={type}
              onClick={() => deleteClipItem(clipItem.id)}
            >
              <Trash2 className="text-background" />
            </ItemActionButton>
          </div>
        </div>
        {type === 'text' && (
          <Textarea
            className={cn(
              'overflow-y-auto overflow-x-hidden resize-none flex-1 h-px w-full p-2 rounded-none rounded-bl-lg rounded-br-lg whitespace-break-spaces overscroll-contain focus-visible:ring-0',
              cardBgCls(),
            )}
            readOnly
            value={value}
            tabIndex={-1}
          />
        )}
        {type === 'image' && (
          <img
            className="flex-1 h-px w-full object-contain border rounded-bl-lg rounded-br-lg"
            src={`data:image/png;base64, ${value}`}
            alt={`image copied at ${fullDate}`}
          />
        )}
        {type === 'files' && (
          <div
            className={cn(
              'flex-1 h-px w-full border rounded-bl-lg rounded-br-lg overflow-y-auto overflow-x-hidden',
              scrollBarCls(),
            )}
          >
            {value.map((file) => {
              return (
                <div
                  key={file}
                  className="px-2 py-1 border-b last:border-b-0 flex items-center gap-1"
                >
                  <div
                    className="truncate flex-1 select-text cursor-text"
                    title={file}
                  >
                    {file}
                  </div>
                  <RevealInDirButton
                    path={file}
                    onError={handleReealInDirError}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DateDistanceDisplay(props: { date: number; fullDate: string }) {
  const { date, fullDate } = props;

  const { i18n } = useTranslation();
  const [distance, setDistance] = useState('');

  useOnceEffect(() => {
    setInterval(() => {
      setDistance(fmtDateDistance(date, i18n.language));
    }, 1000 * 60);
  });

  useEffect(() => {
    setDistance(fmtDateDistance(date, i18n.language));
  }, [date, i18n.language]);

  return (
    <div className="text-sm" title={fullDate}>
      {distance}
    </div>
  );
}

function ItemActionButton(
  props: React.PropsWithChildren<{
    onClick: () => void;
    type: string;
    disabled?: boolean;
  }>,
) {
  const { onClick, children, type, disabled } = props;

  return (
    <Button
      className={cn(
        type === 'text' && 'hover:bg-yellow-400',
        type === 'image' && 'hover:bg-green-400',
        type === 'files' && 'hover:bg-cyan-400',
      )}
      variant="ghost"
      size="icon"
      onClick={onClick}
      disabled={disabled}
      tabIndex={-1}
    >
      {children}
    </Button>
  );
}

function RevealInDirButton(props: {
  path: string;
  onError: (path: string) => void;
}) {
  const { path, onError } = props;
  const t = useT();

  const name = (() => {
    if (PLATFORM === 'darwin') {
      return t('finder');
    }
    if (PLATFORM === 'win32') {
      return t('fileExplorer');
    }
    return t('fileManager');
  })();

  const handleClick = async () => {
    try {
      await revealItemInDir(path);
    } catch (error) {
      toastError(t('somethingWentWrong'), error);
      onError(path);
    }
  };

  return (
    <TooltipButton
      tooltip={t('revealInDir', { name })}
      onClick={handleClick}
      tabIndex={-1}
    >
      <FolderOpen />
    </TooltipButton>
  );
}
