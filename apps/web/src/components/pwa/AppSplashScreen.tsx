import { Receipt } from 'lucide-react';

export function AppSplashScreen({
  label = 'Oturum kontrol ediliyor…',
}: {
  label?: string;
}): JSX.Element {
  return (
    <div className="app-splash" role="status" aria-live="polite">
      <div className="app-splash-logo">
        <Receipt size={30} aria-hidden="true" />
      </div>
      <strong>Masraf</strong>
      <span>{label}</span>
      <div className="app-splash-progress" aria-hidden="true" />
    </div>
  );
}
