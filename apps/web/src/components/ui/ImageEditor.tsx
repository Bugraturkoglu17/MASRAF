import { Check, RefreshCw, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Props {
  file: File;
  onSave: (edited: File) => void;
  onCancel: () => void;
  onReselect: () => void;
}

const VIEW = 300; // crop viewport size in CSS px (square)
const OUT = 1080; // canvas output resolution

export function ImageEditor({ file, onSave, onCancel, onReselect }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [src] = useState(() => URL.createObjectURL(file));
  const [nat, setNat] = useState({ w: 0, h: 0 });
  const [rot, setRot] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const origin = useRef({ cx: 0, cy: 0, ox: 0, oy: 0 });

  useEffect(() => () => URL.revokeObjectURL(src), [src]);

  const swap = rot === 90 || rot === 270;
  const effW = swap ? nat.h : nat.w;
  const effH = swap ? nat.w : nat.h;
  // Scale so image covers the viewport (like object-fit: cover) at zoom=1
  const base = nat.w > 0 ? Math.max(VIEW / effW, VIEW / effH) : 1;
  const total = base * zoom;

  const handleLoad = () => {
    const img = imgRef.current;
    if (img) setNat({ w: img.naturalWidth, h: img.naturalHeight });
  };

  const handleSave = () => {
    const img = imgRef.current;
    if (!img || !nat.w) return;
    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, OUT, OUT);
    const f = OUT / VIEW; // scale factor from display to output
    ctx.save();
    ctx.translate((VIEW / 2 + off.x) * f, (VIEW / 2 + off.y) * f);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(total * f, total * f);
    ctx.drawImage(img, -nat.w / 2, -nat.h / 2);
    ctx.restore();
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onSave(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  };

  const pDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    origin.current = { cx: e.clientX, cy: e.clientY, ox: off.x, oy: off.y };
  };
  const pMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOff({
      x: origin.current.ox + (e.clientX - origin.current.cx),
      y: origin.current.oy + (e.clientY - origin.current.cy),
    });
  };
  const pUp = () => setDragging(false);

  return (
    <div className="img-editor-backdrop">
      <div className="img-editor-wrap">
        {/* Header */}
        <div className="img-editor-header">
          <button type="button" onClick={onCancel} className="img-editor-icon-btn">
            <X size={22} />
          </button>
          <span className="img-editor-title">Fotoğrafı Düzenle</span>
          <button type="button" onClick={handleSave} className="img-editor-save-btn">
            <Check size={15} />
            Kaydet
          </button>
        </div>

        {/* Crop viewport */}
        <div
          className="img-editor-viewport"
          onPointerDown={pDown}
          onPointerMove={pMove}
          onPointerUp={pUp}
          onPointerCancel={pUp}
          style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        >
          {src && (
            <img
              ref={imgRef}
              src={src}
              alt=""
              draggable={false}
              onLoad={handleLoad}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${off.x}px), calc(-50% + ${off.y}px)) rotate(${rot}deg) scale(${total})`,
                transformOrigin: 'center center',
                maxWidth: 'none',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          )}
          <span className="img-editor-corner tl" />
          <span className="img-editor-corner tr" />
          <span className="img-editor-corner bl" />
          <span className="img-editor-corner br" />
        </div>

        <p className="img-editor-hint">Sürükle · Yakınlaştır · Döndür</p>

        {/* Zoom row */}
        <div className="img-editor-zoom-row">
          <button
            type="button"
            className="img-editor-icon-btn"
            onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
          >
            <ZoomOut size={18} />
          </button>
          <input
            type="range"
            min={0.5}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="img-editor-slider"
            aria-label="Yakınlaştırma"
          />
          <button
            type="button"
            className="img-editor-icon-btn"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
          >
            <ZoomIn size={18} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="img-editor-actions">
          <button
            type="button"
            className="img-editor-action-btn"
            onClick={() => {
              setRot((r) => (r + 90) % 360);
              setOff({ x: 0, y: 0 });
            }}
          >
            <RotateCcw size={20} />
            <span>Döndür</span>
          </button>
          <button type="button" className="img-editor-action-btn" onClick={onReselect}>
            <RefreshCw size={20} />
            <span>Yeniden Seç</span>
          </button>
        </div>
      </div>
    </div>
  );
}
