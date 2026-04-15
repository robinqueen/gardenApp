/**
 * PlantIcon
 *
 * Renders a seed/plant emoji icon. When `iconIsApprox` is true on the seed
 * a small `~` badge is overlaid in the bottom-right corner to signal that
 * the emoji is the closest available approximation — not a literal match.
 *
 * Usage:
 *   <PlantIcon seed={seed} />
 *   <PlantIcon seed={seed} size="lg" />
 */

import type { CatalogSeed } from '../types';

interface PlantIconProps {
  seed: Pick<CatalogSeed, 'icon' | 'iconIsApprox'>;
  /** Extra class applied to the outer wrapper span. */
  className?: string;
}

export function PlantIcon({ seed, className }: PlantIconProps) {
  if (!seed.iconIsApprox) {
    // No badge needed — render plain, no wrapper overhead
    return <span className={className}>{seed.icon}</span>;
  }

  return (
    <span className={`plant-icon-wrap${className ? ` ${className}` : ''}`}>
      {seed.icon}
      <span className="plant-icon-approx" title="Icon is an approximation — no exact emoji available">~</span>
    </span>
  );
}
