import { Toaster } from '~/components/shadcn/sonner';
import { TooltipProvider } from '~/components/shadcn/tooltip';
import { AppHeader } from '~/views/app-header';
import { List } from '~/views/list';

export default function App() {
  return (
    <div className="h-screen w-screen flex flex-col select-none">
      <TooltipProvider delayDuration={100} skipDelayDuration={90}>
        <AppHeader />
        <List />
      </TooltipProvider>
      <Toaster />
    </div>
  );
}
