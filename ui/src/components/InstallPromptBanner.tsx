import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export function InstallPromptBanner() {
  const { canInstall, installApp, isInstalled } = useInstallPrompt();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if already installed, can't install, or user dismissed
  if (isInstalled || !canInstall || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    await installApp();
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-amber-900/50 bg-gradient-to-r from-amber-950/95 to-orange-950/95 px-4 py-3 backdrop-blur-sm sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-2xl">
            🐝
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-100">Install Hivemind Dashboard</h3>
            <p className="text-xs text-amber-200/80">Get faster access and offline support</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 transition-all hover:bg-amber-400 active:scale-95"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Install App</span>
            <span className="sm:hidden">Install</span>
          </button>

          <button
            onClick={handleDismiss}
            className="rounded-lg p-2 text-amber-200/60 transition-colors hover:bg-amber-900/30 hover:text-amber-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
