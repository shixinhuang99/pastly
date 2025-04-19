import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const scrollBarCls = () => {
  return 'scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent scrollbar-thumb-rounded-full';
};

export const cardBgCls = () => {
  return 'bg-neutral-100 dark:bg-gray-900';
};
