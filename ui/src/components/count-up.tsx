import { useEffect, useState } from 'react';
import CountUpPrimitive from 'react-countup';

export function CountUp(props: { value: number }) {
  const { value } = props;

  const [startEnd, setStartEnd] = useState<[number, number]>([0, value]);

  useEffect(() => {
    setStartEnd((prev) => [prev[1], value]);
  }, [value]);

  return (
    <CountUpPrimitive start={startEnd[0]} end={startEnd[1]} duration={0.7} />
  );
}
