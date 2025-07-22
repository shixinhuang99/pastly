import { useVirtualizer } from '@tanstack/react-virtual';
import { Triangle } from 'lucide-react';
import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Button } from '~/components';
import { useT } from '~/hooks';
import { cn, scrollBarCls } from '~/utils/cn';

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
    const scrollTopObRef = useRef<HTMLDivElement>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);

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

    useLayoutEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry) {
            return;
          }
          setShowScrollTop(!entry.isIntersecting);
        },
        {
          root: containerRef.current,
          threshold: 0,
        },
      );

      if (scrollTopObRef.current) {
        observer.observe(scrollTopObRef.current);
      }

      return () => {
        observer.disconnect();
      };
    }, []);

    if (!data.length) {
      return (
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="text-muted-foreground">{t('noData')}</div>
        </div>
      );
    }

    const handleScrollToTop = () => {
      setTimeout(() => {
        rowVirtualizer.scrollToIndex(0, {
          align: 'start',
          behavior: 'smooth',
        });
      }, 50);
    };

    return (
      <div
        ref={containerRef}
        className={cn(
          'overflow-y-scroll overflow-x-hidden',
          scrollBarCls(),
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
          <div
            ref={scrollTopObRef}
            className="absolute top-[500px] left-0 h-0 w-full pointer-events-none"
          />
        </div>
        {showScrollTop && (
          <Button
            className="fixed bottom-6 right-4 shadow size-11"
            onClick={handleScrollToTop}
          >
            <div className="flex flex-col">
              <Triangle className="size-4 w-full" />
              <span className="text-xs">{t('scrollTop')}</span>
            </div>
          </Button>
        )}
      </div>
    );
  },
);
