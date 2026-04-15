import { useState, useMemo } from 'react';
import { SEED_CATALOG } from '../catalog/seeds';
import { useGardenStore } from '../store/useGardenStore';
import type { CatalogSeed, UserSeed } from '../types';
import { getPlantingWindow, resolveFrostDates } from '../utils/plantingWindow';
import { getFrostDateObjects } from '../catalog/frostDates';
import { PlantingWindowBadge } from '../components/PlantingWindowBadge';
import { PlantIcon } from '../components/PlantIcon';

type Tab = 'catalog' | 'inventory';

export function Seeds() {
  const { userSeeds, addUserSeed, updateUserSeed, removeUserSeed } = useGardenStore();
  const [tab, setTab] = useState<Tab>('catalog');
  const [query, setQuery] = useState('');
  const [selectedSeed, setSelectedSeed] = useState<CatalogSeed | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null); // userSeed.id

  const { settings } = useGardenStore();
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const frosts = useMemo(() =>
    resolveFrostDates(
      settings.lastFrostDate,
      settings.firstFallFrostDate,
      settings.zipcode,
      today.getFullYear(),
      getFrostDateObjects
    ), [settings, today]);

  const ownedIds = new Set(userSeeds.map((s) => s.seedId));

  const filtered = SEED_CATALOG.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.family.toLowerCase().includes(query.toLowerCase())
  );

  const inventorySeeds = userSeeds
    .map((u) => ({ user: u, catalog: SEED_CATALOG.find((c) => c.id === u.seedId)! }))
    .filter((pair) => pair.catalog != null);

  function toggleOwned(seedId: string) {
    if (ownedIds.has(seedId)) {
      const u = userSeeds.find((s) => s.seedId === seedId);
      if (u) void removeUserSeed(u.id);
    } else {
      void addUserSeed(seedId);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Seeds</h1>

      <div className="tabs">
        <button
          className={`tab${tab === 'catalog' ? ' active' : ''}`}
          onClick={() => setTab('catalog')}
        >
          Catalog
        </button>
        <button
          className={`tab${tab === 'inventory' ? ' active' : ''}`}
          onClick={() => setTab('inventory')}
        >
          My Inventory {userSeeds.length > 0 && `(${userSeeds.length})`}
        </button>
      </div>

      {/* ── Catalog Tab ─────────────────────────────────────── */}
      {tab === 'catalog' && (
        <>
          {!selectedSeed ? (
            <>
              <div className="search-bar">
                <span className="search-icon">🔍</span>
                <input
                  className="form-input"
                  placeholder="Search by name or family…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="seed-grid">
                {filtered.map((seed) => (
                  <div
                    key={seed.id}
                    className={`seed-card${ownedIds.has(seed.id) ? ' owned' : ''}`}
                    onClick={() => setSelectedSeed(seed)}
                  >
                    <div className="seed-icon"><PlantIcon seed={seed} /></div>
                    <div className="seed-name">{seed.name}</div>
                    <div className="seed-family">{seed.family}</div>
                    {frosts && (
                      <PlantingWindowBadge
                        window={getPlantingWindow(seed, frosts.lastFrost, frosts.firstFrost, today)}
                        variant="pill"
                      />
                    )}
                    {ownedIds.has(seed.id) && (
                      <div style={{ marginTop: 4 }}>
                        <span className="badge badge-green">In stock</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <SeedDetail
              seed={selectedSeed}
              owned={ownedIds.has(selectedSeed.id)}
              onToggleOwned={() => toggleOwned(selectedSeed.id)}
              onBack={() => setSelectedSeed(null)}
            />
          )}
        </>
      )}

      {/* ── Inventory Tab ───────────────────────────────────── */}
      {tab === 'inventory' && (
        <>
          {inventorySeeds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🌱</div>
              <h3>No seeds yet</h3>
              <p>Browse the catalog and tap a seed to add it to your inventory.</p>
              <button className="btn btn-primary" onClick={() => setTab('catalog')}>
                Browse Catalog
              </button>
            </div>
          ) : (
            inventorySeeds.map(({ user, catalog }) => (
              <InventoryCard
                key={user.id}
                user={user}
                catalog={catalog}
                isEditingNote={editingNote === user.id}
                onEditNote={() => setEditingNote(editingNote === user.id ? null : user.id)}
                onSaveNote={(note) => {
                  void updateUserSeed({ ...user, notes: note });
                  setEditingNote(null);
                }}
                onRemove={() => void removeUserSeed(user.id)}
              />
            ))
          )}
        </>
      )}
    </div>
  );
}

// ─── Seed Detail ─────────────────────────────────────────────

function SeedDetail({
  seed,
  owned,
  onToggleOwned,
  onBack,
}: {
  seed: CatalogSeed;
  owned: boolean;
  onToggleOwned: () => void;
  onBack: () => void;
}) {
  const { settings } = useGardenStore();
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const frosts = useMemo(() =>
    resolveFrostDates(
      settings.lastFrostDate,
      settings.firstFallFrostDate,
      settings.zipcode,
      today.getFullYear(),
      getFrostDateObjects
    ), [settings, today]);

  const companionNames = seed.companionsWith
    .map((id) => SEED_CATALOG.find((s) => s.id === id)?.name)
    .filter(Boolean);

  const antagonistNames = seed.antagonistsWith
    .map((id) => SEED_CATALOG.find((s) => s.id === id)?.name)
    .filter(Boolean);

  const sowLabel = () => {
    if (!seed.canDirectSow && seed.canStartIndoors) return 'Indoors only';
    if (seed.canDirectSow && !seed.canStartIndoors) return 'Direct sow only';
    return 'Indoor start or direct sow';
  };

  return (
    <>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '0.75rem' }}>
        ← Back
      </button>

      <div className="seed-detail">
        <div className="seed-detail-header">
          <div className="seed-detail-icon">{seed.icon}</div>
          <div className="seed-detail-title">
            <h2>{seed.name}</h2>
            <p>{seed.family}</p>
          </div>
        </div>

        <div className="seed-stats">
          <div className="seed-stat">
            <div className="stat-label">Spacing</div>
            <div className="stat-value">{seed.spacingInches}" apart</div>
          </div>
          <div className="seed-stat">
            <div className="stat-label">Days to Harvest</div>
            <div className="stat-value">~{seed.daysToMaturity} days</div>
          </div>
          <div className="seed-stat">
            <div className="stat-label">Start Method</div>
            <div className="stat-value">{sowLabel()}</div>
          </div>
          {seed.canStartIndoors && (
            <div className="seed-stat">
              <div className="stat-label">Start Indoors</div>
              <div className="stat-value">{seed.indoorStartWeeks} wks before frost</div>
            </div>
          )}
          {seed.canDirectSow && (
            <div className="seed-stat">
              <div className="stat-label">Direct Sow</div>
              <div className="stat-value">
                {seed.directSowWeeks < 0
                  ? `${Math.abs(seed.directSowWeeks)} wks before frost`
                  : seed.directSowWeeks === 0
                    ? 'At last frost'
                    : `${seed.directSowWeeks} wks after frost`}
              </div>
            </div>
          )}
          {seed.needsTrellis && (
            <div className="seed-stat">
              <div className="stat-label">Needs</div>
              <div className="stat-value">🌿 Trellis</div>
            </div>
          )}
          {seed.needsSupport && !seed.needsTrellis && (
            <div className="seed-stat">
              <div className="stat-label">Needs</div>
              <div className="stat-value">🪵 Staking</div>
            </div>
          )}
          {seed.successionIntervalDays > 0 && (
            <div className="seed-stat">
              <div className="stat-label">Succession</div>
              <div className="stat-value">Every {seed.successionIntervalDays}d</div>
            </div>
          )}
          {frosts && (() => {
            const pw = getPlantingWindow(seed, frosts.lastFrost, frosts.firstFrost, today);
            return (
              <div className="seed-stat">
                <div className="stat-label">Plant now?</div>
                <div className="stat-value">
                  <PlantingWindowBadge window={pw} variant="pill" />
                </div>
              </div>
            );
          })()}
        </div>

        {seed.notes && (
          <div className="alert alert-info" style={{ marginTop: '0.75rem' }}>
            {seed.notes}
          </div>
        )}

        {companionNames.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <div className="section-label">Good companions</div>
            <div className="companions">
              {companionNames.map((n) => (
                <span key={n} className="companion-chip">{n}</span>
              ))}
            </div>
          </div>
        )}

        {antagonistNames.length > 0 && (
          <div style={{ marginTop: '0.75rem' }}>
            <div className="section-label">Keep away from</div>
            <div className="companions">
              {antagonistNames.map((n) => (
                <span key={n} className="antagonist-chip">{n}</span>
              ))}
            </div>
          </div>
        )}

        <button
          className={`btn btn-full mt-2${owned ? ' btn-secondary' : ' btn-primary'}`}
          onClick={onToggleOwned}
        >
          {owned ? '✓ In My Inventory — Remove' : '+ Add to My Inventory'}
        </button>
      </div>
    </>
  );
}

// ─── Inventory Card ───────────────────────────────────────────

function InventoryCard({
  user,
  catalog,
  isEditingNote,
  onEditNote,
  onSaveNote,
  onRemove,
}: {
  user: UserSeed;
  catalog: CatalogSeed;
  isEditingNote: boolean;
  onEditNote: () => void;
  onSaveNote: (note: string) => void;
  onRemove: () => void;
}) {
  const [noteValue, setNoteValue] = useState(user.notes);

  return (
    <div className="card" style={{ marginBottom: '0.75rem' }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>{catalog.icon}</span>
          <div>
            <div className="card-title">{catalog.name}</div>
            <div className="text-muted text-sm">{catalog.family} · {user.purchaseYear}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button className="btn btn-ghost btn-sm" onClick={onEditNote} title="Edit notes">
            ✏️
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onRemove} title="Remove">
            ✕
          </button>
        </div>
      </div>

      {isEditingNote ? (
        <div>
          <textarea
            className="form-textarea"
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            placeholder="Notes, variety info, source…"
            rows={2}
          />
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={onEditNote}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={() => onSaveNote(noteValue)}>
              Save
            </button>
          </div>
        </div>
      ) : user.notes ? (
        <p className="text-sm text-muted">{user.notes}</p>
      ) : null}
    </div>
  );
}
