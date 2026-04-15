import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { GapSuggestion } from '../types';
import { trackGapSuggestionClicked } from '../utils/analytics';
import { PlantIcon } from './PlantIcon';

interface GapSuggestionsPanelProps {
  gaps: GapSuggestion[];
  /** 'calendar' = full expanded view; 'dashboard' = compact with link */
  variant?: 'calendar' | 'dashboard';
  /** Makes the whole panel header a collapse toggle */
  collapsible?: boolean;
  open?: boolean;
  onToggle?: () => void;
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function GapSuggestionsPanel({ gaps, variant = 'calendar', collapsible, open = true, onToggle }: GapSuggestionsPanelProps) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (gaps.length === 0) return null;

  function toggle(bedId: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(bedId)) next.delete(bedId);
      else next.add(bedId);
      return next;
    });
  }

  const displayGaps = variant === 'dashboard' ? gaps.slice(0, 3) : gaps;
  const panelOpen = collapsible ? open : true;

  return (
    <div className="gap-panel">
      <div
        className={`gap-panel-header${collapsible ? ' gap-panel-header--collapsible' : ''}`}
        onClick={collapsible ? onToggle : undefined}
      >
        <span className="gap-panel-title">🔄 Succession gaps</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="gap-panel-count">{gaps.length} bed{gaps.length !== 1 ? 's' : ''}</span>
          {collapsible && <span className="dash-chevron">{panelOpen ? '▾' : '▸'}</span>}
        </div>
      </div>

      {panelOpen && displayGaps.map((gap) => {
        const isOpen = variant === 'calendar' || expanded.has(gap.bedId);

        return (
          <div key={gap.bedId} className="gap-card">
            <div
              className="gap-card-header"
              onClick={() => toggle(gap.bedId)}
              style={{ cursor: 'pointer' }}
            >
              <div>
                <div className="gap-card-bed">{gap.bedName}</div>
                <div className="gap-card-dates text-sm text-muted">
                  {fmtDate(gap.gapStartDate)} → {fmtDate(gap.gapEndDate)}
                  <span className="gap-days-badge">{gap.gapDays}d free</span>
                </div>
              </div>
              {variant === 'dashboard' && (
                <span style={{ color: 'var(--color-text-muted)' }}>{isOpen ? '▾' : '▸'}</span>
              )}
            </div>

            {isOpen && (
              <div className="gap-suggestions">
                <div className="gap-suggestions-label">Could fit:</div>
                <div className="gap-chips">
                  {gap.suggestedCrops.map(({ seed, method, harvestBy }) => (
                    <div
                      key={seed.id}
                      className="gap-chip"
                      onClick={() => trackGapSuggestionClicked(seed.name, gap.bedName, method)}
                      style={{ cursor: 'pointer' }}
                    >
                      <span className="gap-chip-icon"><PlantIcon seed={seed} /></span>
                      <div className="gap-chip-body">
                        <div className="gap-chip-name">{seed.name}</div>
                        <div className="gap-chip-meta">
                          {method === 'direct-sow' ? '🌾 Direct sow' : '🪴 Transplant'}
                          {' · '}harvest by {fmtDate(harvestBy)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {panelOpen && variant === 'dashboard' && gaps.length > 3 && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ width: '100%', marginTop: '0.35rem' }}
          onClick={() => navigate('/calendar')}
        >
          +{gaps.length - 3} more → view on schedule
        </button>
      )}
    </div>
  );
}
