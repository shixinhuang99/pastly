import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { useAtom, useSetAtom } from 'jotai';
import { Copy, FolderOpen, LoaderCircle, Trash2 } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  onSomethingUpdate,
  readFiles,
  readImageBase64,
  readText,
  startListening,
  writeFiles,
  writeImageBase64,
  writeText,
} from 'tauri-plugin-clipboard-api';
import { clipItemsAtom, writeToClipboardPendingAtom } from '~/atom/primitive';
import {
  Button,
  SearchInput,
  Textarea,
  TooltipButton,
  toastError,
} from '~/components';
import { VirtualList, type VirtualListRef } from '~/components/virtual-list';
import { useOnceEffect, useT } from '~/hooks';
import type { BaseClipItem, ClipItem, ClipItemType } from '~/types';
import { cn, scrollBarVariants } from '~/utils/cn';
import { fmtDate, fmtDateDistance } from '~/utils/common';

let copiedItemId = '';

function createClipItem<T extends ClipItemType, P>(
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
  const [clipItems, setClipItems] = useAtom(clipItemsAtom);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const t = useT();
  const setWriteToClipboardPending = useSetAtom(writeToClipboardPendingAtom);
  const virtualListRef = useRef<VirtualListRef>(null);

  useOnceEffect(() => {
    onSomethingUpdate(async (updateTypes) => {
      let newClipItem: ClipItem | null = null;
      if (updateTypes.files) {
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
      setClipItems((old) => {
        if (copiedItemId && old.length && old[0].id === copiedItemId) {
          return old;
        }
        return [newClipItem, ...old];
      });
      if (!copiedItemId) {
        virtualListRef.current?.scrollToTop();
      }
      setWriteToClipboardPending(false);
      copiedItemId = '';
    });
    startListening();
  });

  const handleClipItemRemove = (id: string) => {
    setClipItems(clipItems.filter((item) => item.id !== id));
  };

  const handleClipItemChange = (newItem: ClipItem) => {
    setClipItems(
      clipItems.map((item) => {
        if (item.id === newItem.id) {
          return newItem;
        }
        return item;
      }),
    );
  };

  const filteredClipItems = useMemo(() => {
    return clipItems.filter((item) => {
      if (item.type === 'text') {
        return item.value.includes(deferredSearch);
      }
      if (item.type === 'files') {
        return item.value.some((file) => file.includes(deferredSearch));
      }
      return deferredSearch.length <= 0;
    });
  }, [deferredSearch, clipItems]);

  return (
    <div className="flex-1 h-px w-full flex flex-col">
      <div className="pl-4 pr-6 py-2 flex items-center gap-2">
        <SearchInput
          className="flex-1"
          value={search}
          onValueChange={setSearch}
          placeholder={t('searchByKeyword')}
        />
        <div>{t('itemsCount', { count: clipItems.length })}</div>
      </div>
      <VirtualList
        ref={virtualListRef}
        className="flex-1 h-px"
        data={filteredClipItems}
        estimateSize={250}
        renderItem={(item) => {
          return (
            <Item
              clipItem={item}
              onRemove={handleClipItemRemove}
              onChange={handleClipItemChange}
            />
          );
        }}
      />
    </div>
  );
}

function Item(props: {
  clipItem: ClipItem;
  onRemove: (id: string) => void;
  onChange: (newItem: ClipItem) => void;
}) {
  const { clipItem, onRemove, onChange } = props;

  const t = useT();
  const [writeToClipboardPending, setWriteToClipboardPending] = useAtom(
    writeToClipboardPendingAtom,
  );

  const { id, type, value, date } = clipItem;
  const fullDate = fmtDate(date);

  const handleReealInDirError = (path: string) => {
    if (type !== 'files') {
      return;
    }
    const newFiles = value.filter((file) => file !== path);
    if (newFiles.length === 0) {
      onRemove(clipItem.id);
      return;
    }
    onChange({ ...clipItem, value: newFiles });
  };

  const handleCopy = async () => {
    try {
      copiedItemId = id;
      setWriteToClipboardPending(true);
      if (type === 'text') {
        await writeText(value);
      } else if (type === 'image') {
        await writeImageBase64(value);
      } else if (type === 'files') {
        await writeFiles(value);
      }
    } catch (error) {
      toastError(t('opreationFailed'), error);
      copiedItemId = '';
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
            <ItemActionButton type={type} onClick={() => onRemove(clipItem.id)}>
              <Trash2 className="text-background" />
            </ItemActionButton>
          </div>
        </div>
        {type === 'text' && (
          <Textarea
            className="overflow-y-auto overflow-x-hidden resize-none flex-1 h-px w-full p-2 bg-neutral-100 dark:bg-gray-900 rounded-none rounded-bl-lg rounded-br-lg whitespace-break-spaces overscroll-contain focus-visible:ring-0"
            readOnly
            value={value}
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
              scrollBarVariants(),
            )}
          >
            {value.map((file) => {
              return (
                <div
                  key={file}
                  className="px-2 py-1 border-b last:border-b-0 flex items-center"
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
      toastError(t('opreationFailed'), error);
      onError(path);
    }
  };

  return (
    <TooltipButton tooltip={t('revealInDir', { name })} onClick={handleClick}>
      <FolderOpen />
    </TooltipButton>
  );
}
