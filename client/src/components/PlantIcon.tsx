import type { CatalogSeed } from '../types';
import { getSeedIconUrl } from '../catalog/seedIcons';

interface PlantIconProps {
  seed: Pick<CatalogSeed, 'icon' | 'iconIsApprox'> & { id?: string; seedId?: string };
  className?: string;
}

export function PlantIcon({ seed, className }: PlantIconProps) {
  const resolvedId = seed.id ?? seed.seedId ?? '';
  const imgUrl = getSeedIconUrl(resolvedId);

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={seed.id}
        className={`plant-icon-img${className ? ` ${className}` : ''}`}
        draggable={false}
      />
    );
  }

  // Emoji fallback (no POLYGON icon available)
  if (!seed.iconIsApprox) {
    return <span className={className}>{seed.icon}</span>;
  }

  return (
    <span className={`plant-icon-wrap${className ? ` ${className}` : ''}`}>
      {seed.icon}
      <span className="plant-icon-approx" title="Icon is an approximation">~</span>
    </span>
  );
}
