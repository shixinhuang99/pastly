import { useAtom } from 'jotai';
import { Copy, FolderOpen, Trash2 } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  onFilesUpdate,
  onImageUpdate,
  onTextUpdate,
  startListening,
} from 'tauri-plugin-clipboard-api';
import { clipItemsAtom } from '~/atom/primitive';
import { Button, SearchInput, Textarea } from '~/components';
import { VirtualList } from '~/components/virtual-list';
import { useOnceEffect, useT } from '~/hooks';
import type { ClipItem } from '~/types';
import { cn, scrollBarVariants } from '~/utils/cn';
import { fmtDate, fmtDateDistance } from '~/utils/common';

export function List() {
  const [clipItems, setClipItems] = useAtom(clipItemsAtom);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const t = useT();

  const handleRemoveClipItem = (index: number) => {
    setClipItems(clipItems.filter((_, i) => i !== index));
  };

  useOnceEffect(() => {
    onTextUpdate((text) => {
      setClipItems((prev) => [
        { type: 'text', value: text, date: Date.now() },
        ...prev,
      ]);
    });
    onImageUpdate((base64) => {
      setClipItems((prev) => [
        { type: 'image', value: base64, date: Date.now() },
        ...prev,
      ]);
    });
    onFilesUpdate((files) => {
      setClipItems((prev) => [
        { type: 'files', value: files, date: Date.now() },
        ...prev,
      ]);
    });
    startListening();
  });

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
      <div className="px-4 py-2">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder={t('searchByKeyword')}
        />
      </div>
      <VirtualList
        className="flex-1 h-px"
        data={filteredClipItems}
        estimateSize={250}
        renderItem={(item, index) => {
          return (
            <Item
              key={index}
              clipItem={item}
              onRemove={() => handleRemoveClipItem(index)}
            />
          );
        }}
      />
    </div>
  );
}

function Item(props: {
  clipItem: ClipItem;
  onRemove: () => void;
}) {
  const { clipItem, onRemove } = props;

  const t = useT();

  const { type, value, date } = clipItem;
  const fullDate = fmtDate(date);

  return (
    <div className="h-full w-full px-4 py-2">
      <div className="h-full w-full flex flex-col rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer">
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
            <ItemActionButton type={type} onClick={() => {}}>
              <Copy className="text-background" />
            </ItemActionButton>
            <ItemActionButton type={type} onClick={onRemove}>
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
                  title={file}
                >
                  <div className="truncate">{file}</div>
                  <Button variant="ghost" size="icon">
                    <FolderOpen />
                  </Button>
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
  props: React.PropsWithChildren<{ onClick: () => void; type: string }>,
) {
  const { onClick, children, type } = props;

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
    >
      {children}
    </Button>
  );
}
