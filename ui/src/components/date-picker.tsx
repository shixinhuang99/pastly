import { CalendarIcon, CircleX } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '~/components';
import { Calendar } from '~/components/shadcn/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/shadcn/popover';
import { useBoolean, useT } from '~/hooks';
import { cn } from '~/utils/cn';
import { fmtShortDate, getDateFnsLocaleFromI18nLang } from '~/utils/common';

interface DatePickerProps {
  className?: string;
  value?: Date;
  onChange: (v?: Date) => void;
  shouldDisabled: (v: Date) => boolean;
}

export function DatePicker(props: DatePickerProps) {
  const { className, value, onChange, shouldDisabled } = props;

  const { i18n } = useTranslation();
  const t = useT();
  const open = useBoolean();

  const dateDisplay = useMemo(() => {
    if (!value) {
      return null;
    }
    return fmtShortDate(value, i18n.language);
  }, [value, i18n.language]);

  return (
    <Popover open={open.value} onOpenChange={open.set}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[150px] text-start pl-3 font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          {value ? dateDisplay : <span>{t('pickDate')}</span>}
          <span className="ml-auto">
            {value ? (
              <CircleX
                className="size-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(undefined);
                }}
              />
            ) : (
              <CalendarIcon className="size-4 opacity-50" />
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(v) => {
            onChange(v);
            open.off();
          }}
          disabled={(date) => {
            return (
              date > new Date() ||
              shouldDisabled(date) ||
              date < new Date('1900-01-01')
            );
          }}
          locale={getDateFnsLocaleFromI18nLang(i18n.language)}
        />
      </PopoverContent>
    </Popover>
  );
}
