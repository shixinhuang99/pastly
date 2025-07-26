import { type DependencyList, useEffect, useRef } from 'react';

export function useAsyncEffect(fn: () => Promise<void>, deps: DependencyList) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    fnRef.current();
  }, deps);
}
