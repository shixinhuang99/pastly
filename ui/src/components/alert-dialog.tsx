import { LoaderCircle } from 'lucide-react';
import { useT } from '~/hooks';
import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialog as RawAlertDialog,
} from './shadcn/alert-dialog';
import { Button } from './shadcn/button';

interface AlertDialogProps {
  title: React.ReactNode;
  description: React.ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOk: () => void;
  okLoading?: boolean;
  okDisabled?: boolean;
}

export function AlertDialog(props: React.PropsWithChildren<AlertDialogProps>) {
  const {
    children,
    title,
    description,
    open,
    onOpenChange,
    onOk,
    okLoading,
    okDisabled,
  } = props;

  const t = useT();

  return (
    <RawAlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="w-[360px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={okLoading}>
            {t('cancel')}
          </AlertDialogCancel>
          <Button
            onClick={onOk}
            disabled={okDisabled ?? okLoading}
            className="dark:text-foreground"
          >
            {okLoading ? <LoaderCircle className="animate-spin" /> : t('ok')}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </RawAlertDialog>
  );
}
