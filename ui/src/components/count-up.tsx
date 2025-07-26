import { useEffect, useState } from 'react';
import CountUpPrimitive from 'react-countup';
import { cn } from '~/utils/cn';

interface CountUpProps {
  className?: string;
  value: number;
  pending?: boolean;
}

export function CountUp(props: CountUpProps) {
  const { className, value, pending = false } = props;

  const [startEnd, setStartEnd] = useState<[number, number]>([0, value]);

  useEffect(() => {
    setStartEnd((prev) => [prev[1], value]);
  }, [value]);

  return (
    <CountUpPrimitive
      className={cn(pending && 'animate-pulse', className)}
      start={startEnd[0]}
      end={startEnd[1]}
      duration={0.7}
    />
  );
}
