/** Served from /public/railway-study-point-logo.png */
const LOGO_SRC = '/railway-study-point-logo.png';

type BrandLogoProps = {
  /** hero: login/signup; nav: dashboard header; inline: compact row */
  variant?: 'hero' | 'nav' | 'inline';
  /** false = rounded square (legacy); default true = circular mask matching your seal logo */
  circular?: boolean;
  className?: string;
};

const variantClass: Record<NonNullable<BrandLogoProps['variant']>, string> = {
  hero: 'w-32 h-32 sm:w-40 sm:h-40',
  nav: 'w-10 h-10 sm:w-12 sm:h-12',
  inline: 'w-9 h-9',
};

export function BrandLogo({ variant = 'hero', circular = true, className = '' }: BrandLogoProps) {
  const shape = circular
    ? 'rounded-full overflow-hidden aspect-square'
    : 'rounded-lg overflow-hidden';

  return (
    <img
      src={LOGO_SRC}
      alt="Railway Study Point"
      className={`object-contain object-center shrink-0 ${shape} ${variantClass[variant]} ${className}`.trim()}
      width={variant === 'hero' ? 160 : variant === 'nav' ? 48 : 36}
      height={variant === 'hero' ? 160 : variant === 'nav' ? 48 : 36}
      loading="eager"
      fetchPriority="high"
    />
  );
}
