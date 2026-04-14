import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { decodeSharePayload } from '../utils/shareLink';
import { BedGrid } from '../components/BedGrid';
import { getFrostDateObjects, formatDate } from '../catalog/frostDates';

export function ShareView() {
  const { data } = useParams<{ data: string }>();

  const payload = useMemo(() => {
    if (!data) return null;
    return decodeSharePayload(data);
  }, [data]);

  if (!payload) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '3rem' }}>🔗</div>
        <h2>Invalid share link</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>
          This link may be expired or corrupted.
        </p>
        <Link to="/" className="btn btn-primary">Open My Living Garden</Link>
      </div>
    );
  }

  const { garden, zipcode, lastFrostDate, firstFallFrostDate, exportedAt } = payload;

  // Resolve frost dates for display
  const frosts = useMemo(() => {
    try {
      const year = new Date().getFullYear();
      const derived = zipcode?.length >= 3 ? getFrostDateObjects(zipcode, year) : null;
      return {
        last:  lastFrostDate      ? new Date(lastFrostDate + 'T00:00:00')      : derived?.lastFrost,
        first: firstFallFrostDate ? new Date(firstFallFrostDate + 'T00:00:00') : derived?.firstFrost,
      };
    } catch { return null; }
  }, [zipcode, lastFrostDate, firstFallFrostDate]);

  const exportDate = new Date(exportedAt).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const totalPlantings = garden.beds.reduce((n, b) => n + b.slots.length, 0);
  const uniquePlants   = new Set(garden.beds.flatMap(b => b.slots.map(s => s.plantId))).size;

  return (
    <div className="page" style={{ maxWidth: 600, margin: '0 auto', paddingBottom: '4rem' }}>
      {/* Header */}
      <div className="share-header">
        <div className="share-logo">🌱</div>
        <div>
          <h1 className="page-title" style={{ marginBottom: '0.1rem' }}>
            {garden.name}
          </h1>
          <div className="text-muted text-sm">
            Shared on {exportDate} · {garden.year} season
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="share-stats">
        <div className="share-stat">
          <div className="share-stat-n">{garden.beds.length}</div>
          <div className="share-stat-label">beds</div>
        </div>
        <div className="share-stat">
          <div className="share-stat-n">{uniquePlants}</div>
          <div className="share-stat-label">crops</div>
        </div>
        <div className="share-stat">
          <div className="share-stat-n">{totalPlantings}</div>
          <div className="share-stat-label">plantings</div>
        </div>
      </div>

      {/* Frost dates */}
      {frosts?.last && frosts?.first && (
        <div className="share-frost">
          <span>🌱 Last frost: <strong>{formatDate(frosts.last)}</strong></span>
          <span>🍂 First fall frost: <strong>{formatDate(frosts.first)}</strong></span>
        </div>
      )}

      {/* Read-only notice */}
      <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
        📖 This is a read-only shared view. <Link to="/setup">Create your own garden →</Link>
      </div>

      {/* Beds */}
      {garden.beds.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌿</div>
          <h3>No beds in this garden</h3>
        </div>
      ) : (
        garden.beds.map((bed) => (
          <div key={bed.id} className="card" style={{ marginBottom: '1.25rem' }}>
            <div className="card-header">
              <div>
                <div className="card-title">{bed.name}</div>
                <div className="text-muted text-sm">
                  {bed.widthFt}×{bed.lengthFt} ft · {bed.slots.length} planting{bed.slots.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            <BedGrid bed={bed} readonly />
          </div>
        ))
      )}

      {/* CTA */}
      <div style={{ textAlign: 'center', marginTop: '2rem' }}>
        <Link to="/setup" className="btn btn-primary">
          🌿 Start your own garden →
        </Link>
      </div>
    </div>
  );
}
