interface BrandLogoProps {
  /** Panel etiketi (ör. "ADMİN PANELİ"). Kullanıcı panelinde verilmez. */
  subtitle?: string;
  /** full: ikon + "Masraf" yazısını içeren tam logo. compact: küçük ikon + metin. */
  variant?: 'full' | 'compact';
}

const LOGO_GLOW =
  'brightness(1.12) saturate(1.25) drop-shadow(0 0 12px rgba(56,189,248,0.45)) drop-shadow(0 2px 6px rgba(0,0,0,0.35))';

/** Giriş ekranı ve panel kenar çubuklarında kullanılan marka bloğu. */
export function BrandLogo({ subtitle, variant = 'full' }: BrandLogoProps): JSX.Element {
  if (variant === 'compact') {
    return (
      <div style={compactWrapStyle}>
        <img src="/logo-mark.png" alt="Masraf" style={markStyle} />
        <div>
          <div style={compactNameStyle}>Masraf</div>
          {subtitle && <div style={compactSubtitleStyle}>{subtitle}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={fullWrapStyle}>
      <img src="/logo-transparent.png" alt="Masraf" style={lockupStyle} />
      {subtitle && <div style={subtitleStyle}>{subtitle}</div>}
    </div>
  );
}

const fullWrapStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 4,
};

const lockupStyle: React.CSSProperties = {
  display: 'block',
  width: 138,
  height: 'auto',
  filter: LOGO_GLOW,
};

const subtitleStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.1em',
};

const compactWrapStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const markStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  objectFit: 'contain',
  flexShrink: 0,
  filter: LOGO_GLOW,
};

const compactNameStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: '#f1f5f9',
  lineHeight: 1.2,
};

const compactSubtitleStyle: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 700,
  color: '#94a3b8',
  letterSpacing: '0.08em',
};
