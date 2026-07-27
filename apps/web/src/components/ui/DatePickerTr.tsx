import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface DatePickerTrProps {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  onBlur?: () => void;
  style?: React.CSSProperties;
  disabled?: boolean;
  clearable?: boolean;
  min?: string;
  max?: string;
}

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pa'];

function parseIso(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : null;
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDisplay(iso: string): string {
  const date = parseIso(iso);
  if (!date) return '';
  return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
}

function monthLabel(date: Date): string {
  const label = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' }).format(date);
  return label.charAt(0).toLocaleUpperCase('tr-TR') + label.slice(1);
}

export function DatePickerTr({
  id,
  value,
  onChange,
  onBlur,
  style,
  disabled = false,
  clearable = false,
  min,
  max,
}: DatePickerTrProps): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const selectedDate = parseIso(value);
  const [draftDisplay, setDraftDisplay] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());
  const display = draftDisplay ?? toDisplay(value);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(
      firstOfMonth.getFullYear(),
      firstOfMonth.getMonth(),
      1 - mondayOffset,
    );
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      return date;
    });
  }, [viewDate]);

  const selectDate = (date: Date) => {
    const iso = toIso(date);
    if ((min && iso < min) || (max && iso > max)) return;
    onChange(iso);
    setDraftDisplay(null);
    setViewDate(date);
    setOpen(false);
    onBlur?.();
    toggleRef.current?.focus();
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) formatted = `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length > 4) {
      formatted = `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
    }
    setDraftDisplay(formatted);
    if (digits.length !== 8) {
      onChange('');
      return;
    }
    const iso = `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
    const nextValue = parseIso(iso) ? iso : '';
    onChange(nextValue);
  };

  const today = new Date();
  const todayIso = toIso(today);

  return (
    <div ref={rootRef} className="date-picker-tr">
      <div className="date-picker-tr__field">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="GG.AA.YYYY"
          maxLength={10}
          value={display}
          onChange={handleTextChange}
          onBlur={() => {
            setDraftDisplay(null);
            onBlur?.();
          }}
          disabled={disabled}
          style={style}
        />
        <button
          ref={toggleRef}
          type="button"
          className="date-picker-tr__toggle"
          aria-label="Takvimden tarih seç"
          aria-haspopup="dialog"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => {
            if (!open) setViewDate(selectedDate ?? new Date());
            setOpen((current) => !current);
          }}
        >
          <CalendarDays size={21} strokeWidth={1.8} />
        </button>
      </div>

      {open && (
        <div className="date-picker-tr__popover" role="dialog" aria-label="Tarih seçici">
          <div className="date-picker-tr__header">
            <button
              type="button"
              className="date-picker-tr__nav"
              aria-label="Önceki ay"
              onClick={() =>
                setViewDate((current) =>
                  new Date(current.getFullYear(), current.getMonth() - 1, 1),
                )
              }
            >
              <ChevronLeft size={20} />
            </button>
            <strong aria-live="polite">{monthLabel(viewDate)}</strong>
            <button
              type="button"
              className="date-picker-tr__nav"
              aria-label="Sonraki ay"
              onClick={() =>
                setViewDate((current) =>
                  new Date(current.getFullYear(), current.getMonth() + 1, 1),
                )
              }
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="date-picker-tr__weekdays" aria-hidden="true">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="date-picker-tr__days">
            {calendarDays.map((date) => {
              const iso = toIso(date);
              const outside = date.getMonth() !== viewDate.getMonth();
              const outOfRange = Boolean((min && iso < min) || (max && iso > max));
              return (
                <button
                  type="button"
                  key={iso}
                  className="date-picker-tr__day"
                  data-outside={outside || undefined}
                  data-selected={iso === value || undefined}
                  data-today={iso === todayIso || undefined}
                  disabled={outOfRange}
                  aria-disabled={outOfRange}
                  aria-label={new Intl.DateTimeFormat('tr-TR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }).format(date)}
                  aria-pressed={iso === value}
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="date-picker-tr__footer">
            {clearable && value ? (
              <button
                type="button"
                className="date-picker-tr__clear"
                onClick={() => {
                  onChange('');
                  setDraftDisplay(null);
                  setOpen(false);
                  onBlur?.();
                }}
              >
                <X size={16} />
                Temizle
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              className="date-picker-tr__today"
              disabled={Boolean((min && todayIso < min) || (max && todayIso > max))}
              onClick={() => selectDate(today)}
            >
              Bugün
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
