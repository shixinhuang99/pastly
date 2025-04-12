import { useVirtualizer } from '@tanstack/react-virtual';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useT } from '~/hooks';
import { cn, scrollBarVariants } from '~/utils/cn';

interface VirtualListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  estimateSize?: number;
}

export interface VirtualListRef {
  scrollToTop: () => void;
}

export const VirtualList = forwardRef<VirtualListRef, VirtualListProps<any>>(
  <T extends { id: string }>(
    props: VirtualListProps<T>,
    ref: React.Ref<VirtualListRef>,
  ) => {
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

    useImperativeHandle(
      ref,
      () => ({
        scrollToTop: () => {
          setTimeout(() => {
            rowVirtualizer.scrollToIndex(0, {
              align: 'start',
              behavior: 'smooth',
            });
          }, 50);
        },
      }),
      [rowVirtualizer],
    );

    if (!data.length) {
      return (
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="text-muted-foreground">{t('noData')}</div>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className={cn(
          'overflow-y-scroll overflow-x-hidden',
          scrollBarVariants(),
          className,
        )}
      >
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
                key={item.id}
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
      </div>
    );
  },
);
