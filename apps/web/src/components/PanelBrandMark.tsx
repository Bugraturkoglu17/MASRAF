import { useId } from 'react';

interface PanelBrandMarkProps {
  size?: 'compact' | 'default' | 'large';
  className?: string;
}

/** Kullanıcı ve yönetici sayfa başlıklarında kullanılan zeminsiz lacivert marka işareti. */
export function PanelBrandMark({
  size = 'default',
  className = '',
}: PanelBrandMarkProps): JSX.Element {
  const instanceId = useId().replace(/:/g, '');
  const classes = ['panel-brand-mark', `panel-brand-mark--${size}`, className]
    .filter(Boolean)
    .join(' ');
  const leftClipId = `${instanceId}-left`;
  const centerClipId = `${instanceId}-center`;
  const rightClipId = `${instanceId}-right`;
  const beamId = `${instanceId}-beam`;

  const leftPath =
    'M270 220C264 220 260 225 260 232V760C260 767 265 772 272 772H385C392 772 397 767 397 760V374C397 368 395 363 391 359L283 225C280 222 276 220 270 220Z';
  const centerPath =
    'M444 524C438 529 435 535 435 543V760C435 767 440 772 447 772H565C572 772 577 767 577 760V408C577 397 564 392 557 399L444 524Z';
  const rightPath =
    'M754 220C760 220 764 225 764 232V760C764 767 759 772 752 772H639C632 772 627 767 627 760V374C627 368 629 363 633 359L741 225C744 222 748 220 754 220Z';

  return (
    <svg className={classes} viewBox="220 180 584 632" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={leftClipId}>
          <path d={leftPath} />
        </clipPath>
        <clipPath id={centerClipId}>
          <path d={centerPath} />
        </clipPath>
        <clipPath id={rightClipId}>
          <path d={rightPath} />
        </clipPath>
        <linearGradient id={beamId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.38" stopColor="#dcd6ff" stopOpacity="0.08" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="0.62" stopColor="#dcd6ff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g fill="currentColor">
        <path d={leftPath} />
        <path d={centerPath} />
        <path d={rightPath} />
      </g>

      <AnimatedBeam clipId={leftClipId} beamId={beamId} keyTimes="0;0.03;0.23;1" />
      <AnimatedBeam clipId={centerClipId} beamId={beamId} keyTimes="0;0.3;0.5;1" />
      <AnimatedBeam clipId={rightClipId} beamId={beamId} keyTimes="0;0.57;0.77;1" />
    </svg>
  );
}

function AnimatedBeam({
  clipId,
  beamId,
  keyTimes,
}: {
  clipId: string;
  beamId: string;
  keyTimes: string;
}): JSX.Element {
  return (
    <g clipPath={`url(#${clipId})`}>
      <rect
        className="panel-brand-beam"
        x="-420"
        y="-180"
        width="170"
        height="1380"
        fill={`url(#${beamId})`}
        transform="rotate(17 512 512)"
      >
        <animate
          attributeName="x"
          values="-420;-420;1180;1180"
          keyTimes={keyTimes}
          dur="4.8s"
          repeatCount="indefinite"
        />
      </rect>
    </g>
  );
}
