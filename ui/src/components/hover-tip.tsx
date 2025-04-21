import { Info } from 'lucide-react';
import { cn } from '~/utils/cn';
import { Tooltip, TooltipContent, TooltipTrigger } from './shadcn/tooltip';

export function HoverTip(props: { text: string; className?: string }) {
  const { text, className } = props;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info
          className={cn(
            'text-muted-foreground cursor-pointer size-4',
            className,
          )}
        />
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  );
}
