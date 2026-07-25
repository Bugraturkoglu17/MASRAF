interface BrandLogoProps {
  /** Panel etiketi (ör. "ADMİN PANELİ"). Kullanıcı panelinde verilmez. */
  subtitle?: string;
  /** full: standart logo. compact: dar alanlar için küçük logo. */
  variant?: 'full' | 'compact';
}

/** Giriş ekranı ve panel kenar çubuklarında kullanılan marka bloğu. */
export function BrandLogo({ subtitle, variant = 'full' }: BrandLogoProps): JSX.Element {
  return (
    <div className={`brand-logo brand-logo--${variant}`}>
      <img className="brand-logo-mark" src="/logo-mark-animated.svg" alt="" aria-hidden="true" />
      <div className="brand-logo-copy">
        <div className="brand-logo-name">Masraf</div>
        {subtitle && <div className="brand-logo-subtitle">{subtitle}</div>}
      </div>
    </div>
  );
}
