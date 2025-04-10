import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { ScrollArea } from '~/components';
import { useT } from '~/hooks';

interface VirtualListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  estimateSize?: number;
}

export function VirtualList<T>(props: VirtualListProps<T>) {
  'use no memo';

  const { data, renderItem, className, estimateSize } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: data.length,
    estimateSize: () => estimateSize ?? 40,
    getScrollElement: () => containerRef.current,
    overscan: 5,
  });
  const t = useT();

  if (!data.length) {
    return (
      <div className="flex-1 w-full flex items-center justify-center">
        <div className="text-muted-foreground">{t('noData')}</div>
      </div>
    );
  }

  return (
    <ScrollArea ref={containerRef} className={className}>
      <div
        className="relative w-full"
        style={{
          height: rowVirtualizer.getTotalSize(),
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const item = data[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                height: `${virtualRow.size}px`,
              }}
            >
              {renderItem(item, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
