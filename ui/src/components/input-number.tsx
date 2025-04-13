import { useState } from 'react';
import { cn } from '~/utils/cn';
import { Input } from './shadcn/input';

interface InputNumberProps
  extends Omit<React.ComponentProps<typeof Input>, 'value'> {
  value?: number;
  minValue: number;
  maxValue?: number;
}

export function InputNumber(props: InputNumberProps) {
  const {
    minValue,
    maxValue = 2 ** 31 - 1,
    className,
    value,
    onChange = () => {},
    ...restProps
  } = props;

  const [draftValue, setDraftValue] = useState(value?.toString() ?? '');

  const isInvalidValue = (valueAsNumber: number): boolean => {
    return (
      Number.isNaN(valueAsNumber) ||
      !Number.isSafeInteger(valueAsNumber) ||
      valueAsNumber < minValue ||
      valueAsNumber > maxValue
    );
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const valueAsNumber = e.target.valueAsNumber;
    if (isInvalidValue(valueAsNumber)) {
      setDraftValue(value?.toString() ?? '');
      return;
    }
    setDraftValue(valueAsNumber.toString());
    onChange(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valueAsNumber = e.target.valueAsNumber;
    if (isInvalidValue(valueAsNumber)) {
      setDraftValue(e.target.value);
      return;
    }
    setDraftValue(valueAsNumber.toString());
    onChange(e);
  };

  return (
    <Input
      className={cn('dark:bg-gray-900', className)}
      type="number"
      value={draftValue}
      onChange={handleChange}
      onBlur={handleBlur}
      {...restProps}
    />
  );
}
