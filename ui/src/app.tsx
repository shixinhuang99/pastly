import { ErrorBoundary } from 'react-error-boundary';
import { toastError } from '~/components';
import { Toaster } from '~/components/shadcn/sonner';
import { TooltipProvider } from '~/components/shadcn/tooltip';
import { useOnceEffect, useT } from '~/hooks';
import { cn } from '~/utils/cn';
import { Header } from '~/views/header';
import { List } from '~/views/list';

export default function App() {
  const t = useT();

  useOnceEffect(() => {
    window.addEventListener('unhandledrejection', (event) => {
      toastError(t('somethingWentWrong'), event.reason);
    });
  });

  return (
    <div className="h-screen w-screen flex flex-col select-none">
      <TooltipProvider delayDuration={100} skipDelayDuration={90}>
        <Header />
        <ErrorBoundary FallbackComponent={ErrorFallback}>
          <BodyWrapper className="flex flex-col">
            <List />
          </BodyWrapper>
        </ErrorBoundary>
      </TooltipProvider>
      <Toaster />
    </div>
  );
}

function ErrorFallback({ error }: { error: Error }) {
  const t = useT();

  return (
    <BodyWrapper className="flex items-center justify-center">
      <div className="text-red-500">
        <p className="text-lg font-bold">{t('somethingWentWrong')}</p>
        <p>{error.message}</p>
      </div>
    </BodyWrapper>
  );
}

function BodyWrapper(props: React.PropsWithChildren<{ className?: string }>) {
  const { children, className } = props;

  return <div className={cn('flex-1 h-px w-full', className)}>{children}</div>;
}
