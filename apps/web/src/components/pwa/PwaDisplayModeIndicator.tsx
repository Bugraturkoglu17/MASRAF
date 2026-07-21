import { useStandaloneMode } from '@/hooks/useStandaloneMode';

export function PwaDisplayModeIndicator(): JSX.Element {
  const standalone = useStandaloneMode();
  return (
    <span className={standalone ? 'diagnostic-ok' : 'diagnostic-muted'}>
      {standalone ? 'Standalone' : 'Tarayıcı'}
    </span>
  );
}
