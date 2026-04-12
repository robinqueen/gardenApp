import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGardenStore } from '../store/useGardenStore';
import { SEED_CATALOG } from '../catalog/seeds';
import { getFrostDateObjects } from '../catalog/frostDates';
import { TASK_ICONS } from '../utils/plantingSchedule';
import type { ActivityType, PlantStage } from '../types';
import { getPlantingWindow, resolveFrostDates } from '../utils/plantingWindow';
import { PlantingWindowBadge } from '../components/PlantingWindowBadge';
import { WeatherStrip } from '../components/WeatherStrip';
import { detectAllGaps } from '../utils/successionGaps';
import { GapSuggestionsPanel } from '../components/GapSuggestionsPanel';

// ─── Helpers ──────────────────────────────────────────────────

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function parseDate(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function daysFrom(d: Date): number {
  return Math.round((d.getTime() - today().getTime()) / 86_400_000);
}

const STAGE_LABELS: Record<PlantStage, { icon: string; label: string }> = {
  'planned':              { icon: '📋', label: 'Planned' },
  'seeds-started':        { icon: '🌱', label: 'Seeds started' },
  'ready-to-transplant':  { icon: '🪴', label: 'Ready to transplant' },
  'direct-sow':           { icon: '🌾', label: 'Will direct sow' },
  'in-ground':            { icon: '🌿', label: 'In ground' },
  'store-bought':         { icon: '🏪', label: 'Store bought' },
};

const ACTIVITY_OPTIONS: { type: ActivityType; icon: string; label: string }[] = [
  { type: 'watered',     icon: '💧', label: 'Watered'     },
  { type: 'fertilized',  icon: '🌿', label: 'Fertilized'  },
  { type: 'harvested',   icon: '🧺', label: 'Harvested'   },
  { type: 'observed',    icon: '🔍', label: 'Observed'    },
  { type: 'trimmed',     icon: '✂️', label: 'Trimmed'     },
];

// ─── Frost Countdown (compact) ────────────────────────────────

function CompactFrost() {
  const { settings } = useGardenStore();
  const t = today();

  const frosts = useMemo(() => {
    if (!settings.zipcode && !settings.lastFrostDate) return null;
    try {
      const fd = getFrostDateObjects(settings.zipcode, t.getFullYear());
      return {
        last:  settings.lastFrostDate      ? parseDate(settings.lastFrostDate)      : fd.lastFrost,
        first: settings.firstFallFrostDate ? parseDate(settings.firstFallFrostDate) : fd.firstFrost,
      };
    } catch { return null; }
  }, [settings, t]);

  if (!frosts) return null;

  const dLast  = daysFrom(frosts.last);
  const dFirst = daysFrom(frosts.first);

  return (
    <div className="dash-frost">
      <div className={`dash-frost-pill ${dLast > 0 ? 'future' : 'past'}`}>
        🌱 Last frost: {fmtShort(frosts.last)}
        <span className="dash-frost-days">
          {dLast > 0 ? `in ${dLast}d` : dLast === 0 ? 'today' : `${-dLast}d ago`}
        </span>
      </div>
      <div className={`dash-frost-pill ${dFirst > 0 ? 'future' : 'past'}`}>
        🍂 First fall frost: {fmtShort(frosts.first)}
        <span className="dash-frost-days">
          {dFirst > 0 ? `in ${dFirst}d` : dFirst === 0 ? 'today' : `${-dFirst}d ago`}
        </span>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate();
  const { tasks, garden, activityLogs, logActivity, completeTask, settings } = useGardenStore();
  const [loggedType, setLoggedType] = useState<ActivityType | null>(null);
  const [quickLogBedId, setQuickLogBedId] = useState('');

  const t = today();
  const in7  = addDays(t, 7);
  const in14 = addDays(t, 14);

  const beds = garden?.beds ?? [];

  const today2 = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const frosts = useMemo(() =>
    resolveFrostDates(
      settings.lastFrostDate ?? null,
      settings.firstFallFrostDate ?? null,
      settings.zipcode ?? '',
      today2.getFullYear(),
      getFrostDateObjects
    ), [settings, today2]);

  const gaps = useMemo(() => {
    if (!garden || !frosts) return [];
    try {
      return detectAllGaps(garden.beds, tasks, frosts.firstFrost, today2);
    } catch {
      return [];
    }
  }, [garden, tasks, frosts, today2]);

  // ── Tasks bucketed by window ─────────────────────────────────
  const { overdue, thisWeek, upcoming, allThisWeekCount } = useMemo(() => {
    const overdue:  typeof tasks = [];
    const thisWeek: typeof tasks = [];
    const upcoming: typeof tasks = [];

    for (const task of tasks) {
      if (task.completed) continue;
      const d = parseDate(task.date);
      if (d < t)          overdue.push(task);
      else if (d <= in7)  thisWeek.push(task);
      else if (d <= in14) upcoming.push(task);
    }

    // Sort each bucket by date
    const byDate = (a: typeof tasks[0], b: typeof tasks[0]) =>
      a.date.localeCompare(b.date);
    overdue.sort(byDate);
    thisWeek.sort(byDate);
    upcoming.sort(byDate);

    return { overdue, thisWeek, upcoming, allThisWeekCount: overdue.length + thisWeek.length };
  }, [tasks, t, in7, in14]);

  // ── Active plantings (in-ground or store-bought) ──────────────
  const activePlantings = useMemo(() => {
    const result: {
      slotId: string;
      bedName: string;
      seedName: string;
      seedIcon: string;
      plantId: string;
      stage: PlantStage;
      harvestTask?: (typeof tasks)[0];
    }[] = [];

    for (const bed of beds) {
      for (const slot of bed.slots) {
        const stage = slot.stage ?? 'planned';
        if (stage !== 'in-ground' && stage !== 'store-bought') continue;
        const seed = SEED_CATALOG.find((s) => s.id === slot.plantId);
        if (!seed) continue;
        const harvestTask = tasks.find(
          (tk) => tk.slotId === slot.id && tk.type === 'harvest' && !tk.completed
        );
        result.push({ slotId: slot.id, bedName: bed.name, seedName: seed.name, seedIcon: seed.icon, plantId: seed.id, stage, harvestTask });
      }
    }
    return result;
  }, [beds, tasks]);

  const hasInGroundPlants = activePlantings.length > 0;

  // ── Upcoming transplants (ready-to-transplant or seeds-started) ─
  const readyToAction = useMemo(() => {
    const result: { bedName: string; seedName: string; seedIcon: string; stage: PlantStage; task?: (typeof tasks)[0] }[] = [];

    for (const bed of beds) {
      for (const slot of bed.slots) {
        const stage = slot.stage ?? 'planned';
        if (stage !== 'ready-to-transplant' && stage !== 'seeds-started') continue;
        const seed = SEED_CATALOG.find((s) => s.id === slot.plantId);
        if (!seed) continue;
        const transplantTask = tasks.find(
          (tk) => tk.slotId === slot.id && tk.type === 'transplant' && !tk.completed
        );
        result.push({ bedName: bed.name, seedName: seed.name, seedIcon: seed.icon, stage, task: transplantTask });
      }
    }
    return result;
  }, [beds, tasks]);

  // ── Today's activity (to highlight quick-log) ─────────────────
  const todayIso = t.toISOString().slice(0, 10);
  const loggedToday = activityLogs.filter((l) => l.date === todayIso);

  // ── Quick log handler ─────────────────────────────────────────
  async function handleQuickLog(type: ActivityType) {
    await logActivity({
      type,
      date: todayIso,
      bedId: quickLogBedId || undefined,
      note: '',
    });
    setLoggedType(type);
    setTimeout(() => setLoggedType(null), 1800);
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="page">
      {/* Header */}
      <div className="dash-header">
        <div>
          <h1 className="page-title" style={{ marginBottom: 0 }}>{greeting} 🌱</h1>
          <div className="text-muted text-sm">
            {t.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
        {allThisWeekCount > 0 && (
          <div className="dash-badge">{allThisWeekCount} this week</div>
        )}
      </div>

      <CompactFrost />
      <WeatherStrip
        zipcode={settings.zipcode ?? ''}
        hasInGroundPlants={hasInGroundPlants}
      />

      {/* ── Overdue ─────────────────────────────────────────── */}
      {overdue.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-label overdue">⚠️ Overdue ({overdue.length})</div>
          {overdue.map((task) => (
            <TaskRow key={task.id} task={task} onComplete={() => void completeTask(task.id, true)} />
          ))}
        </div>
      )}

      {/* ── This week ───────────────────────────────────────── */}
      {thisWeek.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-label">📅 This week ({thisWeek.length})</div>
          {thisWeek.map((task) => (
            <TaskRow key={task.id} task={task} onComplete={() => void completeTask(task.id, true)} />
          ))}
        </div>
      )}

      {overdue.length === 0 && thisWeek.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '1.25rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>✅</div>
          <div className="fw-bold">All clear for this week</div>
          <div className="text-sm text-muted">Nothing due in the next 7 days.</div>
        </div>
      )}

      {/* ── Ready to act ─────────────────────────────────────── */}
      {readyToAction.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-label">🪴 Needs attention</div>
          {readyToAction.map((p, i) => (
            <div key={i} className="dash-plant-row">
              <span className="dash-plant-icon">{p.seedIcon}</span>
              <div className="dash-plant-info">
                <div className="fw-bold">{p.seedName}</div>
                <div className="text-sm text-muted">
                  {STAGE_LABELS[p.stage].icon} {STAGE_LABELS[p.stage].label}
                  {p.task && ` · ${p.task.title}`}
                  {p.task && ` — ${fmtShort(parseDate(p.task.date))}`}
                </div>
              </div>
              <div className="text-sm text-muted">{p.bedName}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── In ground ────────────────────────────────────────── */}
      {activePlantings.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-label">🌿 In the ground ({activePlantings.length})</div>
          {activePlantings.map((p) => {
            const harvest = p.harvestTask ? parseDate(p.harvestTask.date) : null;
            const daysToHarvest = harvest ? daysFrom(harvest) : null;
            return (
              <div key={p.slotId} className="dash-plant-row">
                <span className="dash-plant-icon">{p.seedIcon}</span>
                <div className="dash-plant-info">
                  <div className="fw-bold">{p.seedName}</div>
                  <div className="text-sm text-muted">{p.bedName}</div>
                </div>
                {harvest && (
                  <div className={`dash-harvest-tag ${daysToHarvest !== null && daysToHarvest <= 7 ? 'soon' : ''}`}>
                    🧺 {daysToHarvest !== null && daysToHarvest <= 0
                      ? 'Ready!'
                      : daysToHarvest !== null && daysToHarvest <= 7
                        ? `${daysToHarvest}d`
                        : fmtShort(harvest)}
                  </div>
                )}
                {harvest && daysToHarvest !== null && daysToHarvest < -14 && (
                  <div className="dash-overdue-harvest">⚠️ Overdue</div>
                )}
                {frosts && (() => {
                  const seed = SEED_CATALOG.find(s => s.id === p.plantId);
                  if (!seed) return null;
                  const pw = getPlantingWindow(seed, frosts.lastFrost, frosts.firstFrost, today2);
                  if (pw.status !== 'in-season' && pw.status !== 'too-late') return null;
                  return <PlantingWindowBadge key="pw" window={pw} variant="dot" />;
                })()}
              </div>
            );
          })}
        </div>
      )}

      {gaps.length > 0 && (
        <div className="dash-section">
          <GapSuggestionsPanel gaps={gaps} variant="dashboard" />
        </div>
      )}

      {/* ── Upcoming (next 2 weeks) ──────────────────────────── */}
      {upcoming.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-label">🔜 Next 2 weeks ({upcoming.length})</div>
          {upcoming.slice(0, 6).map((task) => (
            <TaskRow key={task.id} task={task} onComplete={() => void completeTask(task.id, true)} compact />
          ))}
          {upcoming.length > 6 && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: '0.4rem' }}
              onClick={() => navigate('/calendar')}
            >
              +{upcoming.length - 6} more → view full schedule
            </button>
          )}
        </div>
      )}

      {/* ── Quick Log ────────────────────────────────────────── */}
      <div className="card dash-section" style={{ marginBottom: '1rem' }}>
        <div className="dash-section-label" style={{ marginBottom: '0.5rem' }}>
          📋 Quick log
          {loggedToday.length > 0 && (
            <span className="text-muted" style={{ marginLeft: '0.5rem', fontWeight: 400 }}>
              ({loggedToday.length} logged today)
            </span>
          )}
        </div>

        {beds.length > 1 && (
          <select
            className="form-select"
            value={quickLogBedId}
            onChange={(e) => setQuickLogBedId(e.target.value)}
            style={{ marginBottom: '0.6rem', fontSize: '0.85rem' }}
          >
            <option value="">All beds / General</option>
            {beds.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}

        <div className="dash-quicklog-grid">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              className={`dash-quicklog-btn${loggedType === opt.type ? ' confirmed' : ''}`}
              onClick={() => void handleQuickLog(opt.type)}
            >
              <span>{opt.icon}</span>
              <span>{loggedType === opt.type ? '✓' : opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Nav shortcuts ────────────────────────────────────── */}
      <div className="dash-shortcuts">
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/planner')}>
          🌿 Planner
        </button>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/calendar')}>
          📅 Schedule
        </button>
        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/log')}>
          📋 Full Log
        </button>
      </div>
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────

function TaskRow({
  task,
  onComplete,
  compact = false,
}: {
  task: { id: string; title: string; date: string; type: string; completed: boolean };
  onComplete: () => void;
  compact?: boolean;
}) {
  const d       = parseDate(task.date);
  const diff    = daysFrom(d);
  const isPast  = diff < 0;
  const isToday = diff === 0;

  return (
    <div className={`dash-task-row${isPast ? ' past' : ''}`}>
      <button className="dash-task-check" onClick={onComplete} title="Mark done">
        ○
      </button>
      <div className="dash-task-icon">{TASK_ICONS[task.type as keyof typeof TASK_ICONS] ?? '📌'}</div>
      <div className="dash-task-body">
        <div className="dash-task-title">{task.title}</div>
        {!compact && (
          <div className={`dash-task-date ${isPast ? 'overdue-text' : isToday ? 'today-text' : ''}`}>
            {isToday ? 'Today' : isPast ? `${-diff}d overdue` : diff === 1 ? 'Tomorrow' : fmtShort(d)}
          </div>
        )}
      </div>
      {compact && (
        <div className={`dash-task-date-compact ${isPast ? 'overdue-text' : isToday ? 'today-text' : ''}`}>
          {isToday ? 'Today' : isPast ? `${-diff}d` : fmtShort(d)}
        </div>
      )}
    </div>
  );
}
