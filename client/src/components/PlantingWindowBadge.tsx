import type { PlantingWindow } from '../types';

interface PlantingWindowBadgeProps {
  window: PlantingWindow;
  /** 'pill' = full label pill (seed catalog), 'dot' = icon-only dot (bed grid) */
  variant?: 'pill' | 'dot';
}

const STATUS_ICONS: Record<string, string> = {
  'too-early':      '⏳',
  'start-indoors':  '🌱',
  'direct-sow-now': '🌾',
  'transplant-now': '🪴',
  'in-season':      '🌿',
  'too-late':       '🚫',
};

export function PlantingWindowBadge({ window: pw, variant = 'pill' }: PlantingWindowBadgeProps) {
  const icon = STATUS_ICONS[pw.status] ?? '❓';

  if (variant === 'dot') {
    return (
      <span
        className={`pwb-dot pwb-${pw.color}`}
        title={pw.label}
      >
        {icon}
      </span>
    );
  }

  return (
    <span className={`pwb-pill pwb-${pw.color}`}>
      {icon} {pw.label}
    </span>
  );
}
