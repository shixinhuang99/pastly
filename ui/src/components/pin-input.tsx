import { useEffect, useState } from 'react';
import { Input } from './shadcn/input';

interface PINInputProps extends Omit<React.ComponentProps<'input'>, 'value'> {
  value?: string;
}

export function PINInput(props: PINInputProps) {
  const { value, onChange = () => {}, ...restProps } = props;

  const [draftValue, setDraftValue] = useState(value ?? '');

  useEffect(() => {
    setDraftValue(value ?? '');
  }, [value]);

  const isInvalidValue = (rawValue?: string): boolean => {
    return !(
      rawValue === undefined ||
      !rawValue.length ||
      /^\d{4}$/.test(rawValue)
    );
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (isInvalidValue(rawValue)) {
      setDraftValue(value ?? '');
      return;
    }
    setDraftValue(rawValue);
    onChange(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (!/^\d*$/.test(rawValue)) {
      return;
    }
    if (isInvalidValue(rawValue)) {
      setDraftValue(rawValue);
      return;
    }
    setDraftValue(rawValue);
    onChange(e);
  };

  return (
    <Input
      value={draftValue}
      onChange={handleChange}
      onBlur={handleBlur}
      {...restProps}
    />
  );
}
