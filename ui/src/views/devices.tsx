import { useAtomValue } from 'jotai';
import { Computer, IdCard } from 'lucide-react';
import { devicesAtom } from '~/atom/primitive';
import { useT } from '~/hooks';
import { cardBgCls, cn } from '~/utils/cn';

export function Devices(props: { className?: string }) {
  const { className } = props;

  const devices = useAtomValue(devicesAtom);
  const t = useT();

  if (!devices.length) {
    return (
      <div
        className={cn(
          'flex justify-center items-center h-[50px] text-muted-foreground',
          className,
        )}
      >
        {t('noConnections')}
      </div>
    );
  }

  return (
    <div className={cn('w-full p-2 flex flex-col gap-2', className)}>
      {devices.map((device) => {
        return (
          <div key={device.id} className={cn('rounded py-1 px-3', cardBgCls())}>
            <div className="flex items-center gap-2">
              <Computer className="size-4" />
              <span className="truncate flex-1" title={device.name}>
                {device.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <IdCard className="size-4" />
              <span className="text-muted-foreground">{device.id}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
