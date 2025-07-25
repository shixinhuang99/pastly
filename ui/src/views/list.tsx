import { isSameDay } from 'date-fns';
import { useAtomValue, useSetAtom } from 'jotai';
import { LoaderCircle } from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';
import {
  type UpdatedTypes,
  onSomethingUpdate,
  readFiles,
  readImageBase64,
  readText,
  startListening,
} from 'tauri-plugin-clipboard-api';
import { addClipItemAtom, initClipItemsAtom } from '~/atom/clip-items';
import { clipItemsAtom } from '~/atom/primitive';
import { getDevicesAtom } from '~/atom/server';
import { SearchInput } from '~/components';
import { CountUp } from '~/components/count-up';
import { DatePicker } from '~/components/date-picker';
import { MultiSelect } from '~/components/multi-select';
import { VirtualList } from '~/components/virtual-list';
import { useBoolean, useOnceEffect, useT } from '~/hooks';
import { ipc } from '~/ipc';
import type {
  BaseClipItem,
  ClipItem,
  ClipItemTypes,
  ClipboardSync,
} from '~/types';
import { isJustCopiedItem } from '~/utils/common';
import { migrateImages } from '~/utils/db';
import { Item } from './item';

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
  const loading = useBoolean();
  const [date, setDate] = useState<Date>();
  const getDevices = useSetAtom(getDevicesAtom);
  const [searchTypes, setSearchTypes] = useState<string[]>([]);

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
      if (!newClipItem || isJustCopiedItem(newClipItem)) {
        return;
      }
      addClipItem(newClipItem);
      if (newClipItem.type !== 'files') {
        ipc.broadcastClipboardSync(newClipItem, getDevices());
      }
    });

    ipc.listenClipboardSync((clipboardSync: ClipboardSync) => {
      addClipItem(createClipItem(clipboardSync.kind, clipboardSync.value));
    });

    try {
      loading.on();
      await migrateImages();
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
    if (searchTypes.length) {
      result = result.filter((item) => {
        return searchTypes.some((ty) => ty === item.type);
      });
    }
    return result;
  }, [deferredSearch, clipItems, date, searchTypes]);

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
      <div className="pl-4 pr-6 py-2">
        <div className="flex items-center gap-2 mb-2">
          <SearchInput
            className="flex-1"
            value={search}
            onValueChange={setSearch}
            placeholder={t('searchByKeyword')}
          />
          <div>
            <CountUp value={filteredClipItems.length} />
            <span className="ml-1">{t('itemsUnit')}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker
            className="w-[160px]"
            value={date}
            onChange={setDate}
            shouldDisabled={(v) => {
              return !clipItemDates.some((vv) => isSameDay(vv, v));
            }}
          />
          <MultiSelect
            options={[
              { label: t('text'), value: 'text' },
              { label: t('image'), value: 'image' },
              { label: t('files'), value: 'files' },
            ]}
            value={searchTypes}
            onValueChange={setSearchTypes}
            variant="secondary"
            className="flex-1"
            placeholder={t('pickTypes')}
          />
        </div>
      </div>
      <VirtualList
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
