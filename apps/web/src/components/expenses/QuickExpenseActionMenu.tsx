import { Camera, Image, PenLine } from 'lucide-react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface ActionProps {
  onSelect: () => void;
}

export function GalleryExpenseAction({ onSelect }: ActionProps) {
  return <ActionButton icon={<Image />} label="Galeri" onClick={onSelect} />;
}
export function CameraExpenseAction({ onSelect }: ActionProps) {
  return <ActionButton icon={<Camera />} label="Kamera" onClick={onSelect} />;
}
export function ManualExpenseAction({ onSelect }: ActionProps) {
  return <ActionButton icon={<PenLine />} label="Manuel" onClick={onSelect} />;
}

export function QuickExpenseActionMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element | null {
  const navigate = useNavigate();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  if (!open) return null;

  const carryFiles = (files: FileList | null) => {
    if (!files?.length) return;
    onClose();
    navigate('/expenses/new', { state: { initialFiles: Array.from(files) } });
  };

  return (
    <div
      className="mobile-action-backdrop quick-expense-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="quick-expense-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Yeni masraf ekleme seçenekleri"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={galleryRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-label="Galeriden belge seç"
          onChange={(e) => carryFiles(e.target.files)}
        />
        <input
          ref={cameraRef}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          aria-label="Kamera ile belge çek"
          onChange={(e) => carryFiles(e.target.files)}
        />
        <GalleryExpenseAction onSelect={() => galleryRef.current?.click()} />
        <CameraExpenseAction onSelect={() => cameraRef.current?.click()} />
        <ManualExpenseAction
          onSelect={() => {
            onClose();
            navigate('/expenses/new');
          }}
        />
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="quick-expense-option" onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
    </button>
  );
}
