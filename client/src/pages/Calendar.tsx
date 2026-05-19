import { useState, useMemo } from 'react';
import { useGardenStore } from '../store/useGardenStore';
import { TaskCard } from '../components/TaskCard';
import { groupTasksByWeek, TASK_LABELS } from '../utils/plantingSchedule';
import { getFrostDateObjects } from '../catalog/frostDates';
import { SEED_CATALOG } from '../catalog/seeds';
import type { TaskType } from '../types';
import { toIsoDate } from '../catalog/frostDates';
import { detectAllGaps } from '../utils/successionGaps';
import { GapSuggestionsPanel } from '../components/GapSuggestionsPanel';
import { getSeedIconUrl } from '../catalog/seedIcons';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

type CalView = 'schedule' | 'gantt';

// ─── Frost Countdown ──────────────────────────────────────────

function FrostCountdown() {
  const { settings } = useGardenStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const frosts = useMemo(() => {
    if (!settings.zipcode && !settings.lastFrostDate) return null;
    try {
      const year = today.getFullYear();
      const fd = getFrostDateObjects(settings.zipcode, year);
      return {
        last:      settings.lastFrostDate      ? new Date(settings.lastFrostDate      + 'T00:00:00') : fd.lastFrost,
        firstFall: settings.firstFallFrostDate ? new Date(settings.firstFallFrostDate + 'T00:00:00') : fd.firstFrost,
      };
    } catch { return null; }
  }, [settings]);

  if (!frosts) return null;

  function daysUntil(d: Date): number {
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  }

  const daysToLast  = daysUntil(frosts.last);
  const daysToFall  = daysUntil(frosts.firstFall);

  // Growing season length
  const growingDays = Math.max(0, Math.round(
    (frosts.firstFall.getTime() - frosts.last.getTime()) / 86400000
  ));

  // How far through the season are we?
  const seasonPct = frosts.last <= today && today <= frosts.firstFall
    ? Math.round((today.getTime() - frosts.last.getTime()) /
        (frosts.firstFall.getTime() - frosts.last.getTime()) * 100)
    : null;

  return (
    <div className="frost-banner">
      <div className="frost-row">
        <div className={`frost-stat ${daysToLast > 0 ? 'frost-future' : 'frost-past'}`}>
          <div className="frost-icon">🌱</div>
          <div className="frost-body">
            <div className="frost-label">Last Spring Frost</div>
            <div className="frost-value">
              {frosts.last.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="frost-days">
              {daysToLast > 0 ? `${daysToLast} days away` : daysToLast === 0 ? 'today!' : `${-daysToLast} days ago`}
            </div>
          </div>
        </div>

        <div className="frost-divider" />

        <div className={`frost-stat ${daysToFall > 0 ? 'frost-future' : 'frost-past'}`}>
          <div className="frost-icon">🍂</div>
          <div className="frost-body">
            <div className="frost-label">First Fall Frost</div>
            <div className="frost-value">
              {frosts.firstFall.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            <div className="frost-days">
              {daysToFall > 0 ? `${daysToFall} days away` : daysToFall === 0 ? 'today!' : `${-daysToFall} days ago`}
            </div>
          </div>
        </div>
      </div>

      {/* Growing season progress bar */}
      {growingDays > 0 && (
        <div className="frost-season">
          <div className="frost-season-label">
            {growingDays}-day growing season
            {seasonPct !== null && ` · ${seasonPct}% through`}
          </div>
          <div className="frost-progress-track">
            <div
              className="frost-progress-fill"
              style={{ width: `${Math.min(100, Math.max(0, seasonPct ?? (daysToLast > 0 ? 0 : 100)))}%` }}
            />
            {seasonPct !== null && (
              <div className="frost-progress-dot" style={{ left: `${seasonPct}%` }}>🌿</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Succession Gantt ─────────────────────────────────────────

function SuccessionGantt() {
  const { garden, settings } = useGardenStore();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Derive last frost date
  const lastFrost = useMemo(() => {
    if (settings.lastFrostDate) return new Date(settings.lastFrostDate + 'T00:00:00');
    if (settings.zipcode) {
      try { return getFrostDateObjects(settings.zipcode, today.getFullYear()).lastFrost; }
      catch { /* fall through */ }
    }
    return new Date(today.getFullYear(), 3, 15); // Apr 15 fallback
  }, [settings]);

  const firstFallFrost = useMemo(() => {
    if (settings.firstFallFrostDate) return new Date(settings.firstFallFrostDate + 'T00:00:00');
    if (settings.zipcode) {
      try { return getFrostDateObjects(settings.zipcode, today.getFullYear()).firstFrost; }
      catch { /* fall through */ }
    }
    return new Date(today.getFullYear(), 9, 15); // Oct 15 fallback
  }, [settings]);

  // Build chart items from bed slots
  type GanttRow = {
    bedName: string;
    plantName: string;
    icon: string;
    seedId: string;
    sowDate: Date;
    harvestDate: Date;
    weekOffset: number;
    color: string;
  };

  const FAMILY_COLORS: Record<string, string> = {
    'Nightshade':   '#ef5350',
    'Cucurbit':     '#ffa726',
    'Brassica':     '#66bb6a',
    'Legume':       '#26a69a',
    'Root':         '#ff7043',
    'Allium':       '#ab47bc',
    'Leafy Green':  '#9ccc65',
    'Herb':         '#8d6e63',
    'Grain':        '#ffd54f',
    'Flower':       '#ec407a',
  };

  const rows = useMemo((): GanttRow[] => {
    if (!garden) return [];
    const result: GanttRow[] = [];
    for (const bed of garden.beds) {
      for (const slot of bed.slots) {
        const seed = SEED_CATALOG.find((s) => s.id === slot.plantId);
        if (!seed) continue;

        const offsetDays = slot.weekOffset * 7;

        // Sow date: for direct-sow, offset from last frost; for indoor, transplant date = lastFrost + 0
        let sowDate: Date;
        if (seed.canStartIndoors && seed.indoorStartWeeks > 0) {
          sowDate = new Date(lastFrost.getTime() - seed.indoorStartWeeks * 7 * 86400000 + offsetDays * 86400000);
        } else {
          sowDate = new Date(lastFrost.getTime() + seed.directSowWeeks * 7 * 86400000 + offsetDays * 86400000);
        }

        const harvestDate = new Date(sowDate.getTime() + seed.daysToMaturity * 86400000);

        result.push({
          bedName: bed.name,
          plantName: seed.name,
          icon: seed.icon,
          seedId: seed.id,
          sowDate,
          harvestDate,
          weekOffset: slot.weekOffset,
          color: FAMILY_COLORS[seed.family] ?? '#78909c',
        });
      }
    }
    // Sort by sow date
    return result.sort((a, b) => a.sowDate.getTime() - b.sowDate.getTime());
  }, [garden, lastFrost]);

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <h3>No plantings yet</h3>
        <p>Add plants in the Garden Planner to see your succession timeline.</p>
      </div>
    );
  }

  // Chart window: 2 weeks before first sow to 2 weeks after last harvest
  const windowStart = new Date(Math.min(...rows.map((r) => r.sowDate.getTime())) - 14 * 86400000);
  const windowEnd   = new Date(Math.max(...rows.map((r) => r.harvestDate.getTime())) + 14 * 86400000);
  const windowDays  = (windowEnd.getTime() - windowStart.getTime()) / 86400000;

  function toPct(d: Date) {
    return ((d.getTime() - windowStart.getTime()) / 86400000 / windowDays) * 100;
  }

  const todayPct = toPct(today);

  // Month tick marks
  const monthTicks: { label: string; pct: number }[] = [];
  const cur = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);
  while (cur <= windowEnd) {
    const pct = toPct(cur);
    if (pct >= 0 && pct <= 100) {
      monthTicks.push({ label: MONTHS[cur.getMonth()], pct });
    }
    cur.setMonth(cur.getMonth() + 1);
  }

  // Frost lines
  const lastFrostPct  = toPct(lastFrost);
  const fallFrostPct  = toPct(firstFallFrost);

  return (
    <div className="gantt-wrapper">
      {/* Month axis */}
      <div className="gantt-axis">
        {monthTicks.map((t) => (
          <div key={t.label} className="gantt-month-tick" style={{ left: `${t.pct}%` }}>
            <div className="gantt-month-line" />
            <div className="gantt-month-label">{t.label}</div>
          </div>
        ))}
        {/* Frost lines */}
        {lastFrostPct >= 0 && lastFrostPct <= 100 && (
          <div className="gantt-frost-line gantt-frost-spring" style={{ left: `${lastFrostPct}%` }}>
            <span>🌱 LF</span>
          </div>
        )}
        {fallFrostPct >= 0 && fallFrostPct <= 100 && (
          <div className="gantt-frost-line gantt-frost-fall" style={{ left: `${fallFrostPct}%` }}>
            <span>🍂 FF</span>
          </div>
        )}
        {/* Today */}
        {todayPct >= 0 && todayPct <= 100 && (
          <div className="gantt-today-line" style={{ left: `${todayPct}%` }}>
            <span>Today</span>
          </div>
        )}
      </div>

      {/* Rows */}
      <div className="gantt-rows">
        {rows.map((row, i) => {
          const startPct  = toPct(row.sowDate);
          const endPct    = toPct(row.harvestDate);
          const widthPct  = endPct - startPct;
          const active    = today >= row.sowDate && today <= row.harvestDate;

          return (
            <div key={i} className="gantt-row">
              <div className="gantt-row-label">
                <span className="gantt-row-icon">
                  {getSeedIconUrl(row.seedId)
                    ? <img src={getSeedIconUrl(row.seedId)!} className="plant-icon-img" alt={row.plantName} draggable={false} />
                    : row.icon}
                </span>
                <div className="gantt-row-text">
                  <div className="gantt-row-plant">{row.plantName}</div>
                  <div className="gantt-row-bed">{row.bedName}{row.weekOffset > 0 ? ` +${row.weekOffset}w` : ''}</div>
                </div>
              </div>
              <div className="gantt-row-track">
                {/* Frost zone shading */}
                <div className="gantt-track-bg">
                  {lastFrostPct >= 0 && lastFrostPct <= 100 && (
                    <div className="gantt-frost-zone gantt-frost-zone-spring" style={{ width: `${Math.max(0, lastFrostPct)}%` }} />
                  )}
                  {fallFrostPct >= 0 && fallFrostPct <= 100 && (
                    <div className="gantt-frost-zone gantt-frost-zone-fall" style={{ left: `${Math.min(100, fallFrostPct)}%`, right: 0 }} />
                  )}
                </div>
                <div
                  className={`gantt-bar${active ? ' gantt-bar-active' : ''}`}
                  style={{
                    left:     `${Math.max(0, startPct)}%`,
                    width:    `${Math.min(100 - Math.max(0, startPct), widthPct)}%`,
                    background: row.color,
                  }}
                  title={`${row.plantName}: ${row.sowDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${row.harvestDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                >
                  <span className="gantt-bar-label">
                    {getSeedIconUrl(row.seedId)
                      ? <img src={getSeedIconUrl(row.seedId)!} className="plant-icon-img" alt={row.plantName} draggable={false} />
                      : row.icon}
                  </span>
                </div>
                {/* Today marker */}
                {todayPct >= 0 && todayPct <= 100 && (
                  <div className="gantt-today-marker" style={{ left: `${todayPct}%` }} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="gantt-legend">
        <span>🌱 LF = last spring frost</span>
        <span>🍂 FF = first fall frost</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span className="gantt-bar-active-swatch" /> = currently in ground
        </span>
      </div>
    </div>
  );
}

// ─── Main Calendar Page ───────────────────────────────────────

export function Calendar() {
  const { tasks, completeTask, deleteTask, addCustomTask, garden, settings } = useGardenStore();

  const [calView, setCalView] = useState<CalView>('schedule');
  const currentMonth = new Date().getMonth();
  const [activeMonth, setActiveMonth] = useState(currentMonth);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    date: toIsoDate(new Date()),
    type: 'custom' as TaskType,
  });

  const monthTasks = useMemo(
    () =>
      tasks.filter((t) => {
        const d = new Date(t.date + 'T00:00:00');
        return d.getMonth() === activeMonth;
      }),
    [tasks, activeMonth]
  );

  const weekGroups = useMemo(() => groupTasksByWeek(monthTasks), [monthTasks]);
  const completedCount = monthTasks.filter((t) => t.completed).length;

  async function handleAddTask() {
    if (!newTask.title.trim()) return;
    await addCustomTask({ ...newTask, completed: false });
    setNewTask({ title: '', description: '', date: toIsoDate(new Date()), type: 'custom' });
    setShowAddTask(false);
  }

  const hasTasks = garden && garden.beds.some((b) => b.slots.length > 0);

  const gaps = useMemo(() => {
    if (!garden) return [];
    try {
      const t = new Date(); t.setHours(0, 0, 0, 0);
      const year = t.getFullYear();
      const fd = getFrostDateObjects(settings.zipcode, year);
      const firstFrost = settings.firstFallFrostDate
        ? new Date(settings.firstFallFrostDate + 'T00:00:00')
        : fd.firstFrost;
      return detectAllGaps(garden.beds, tasks, firstFrost, t);
    } catch {
      return [];
    }
  }, [garden, tasks, settings]);

  return (
    <div className="page">
      <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Schedule</h1>
        {calView === 'schedule' && (
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddTask(true)}>+ Task</button>
        )}
      </div>

      {/* Frost countdown */}
      <FrostCountdown />

      {/* View toggle */}
      <div className="view-toggle" style={{ marginBottom: '1rem' }}>
        <button
          className={`view-toggle-btn${calView === 'schedule' ? ' active' : ''}`}
          onClick={() => setCalView('schedule')}
        >
          📅 Schedule
        </button>
        <button
          className={`view-toggle-btn${calView === 'gantt' ? ' active' : ''}`}
          onClick={() => setCalView('gantt')}
        >
          📊 Timeline
        </button>
      </div>

      {gaps.length > 0 && (
        <GapSuggestionsPanel gaps={gaps} variant="calendar" />
      )}

      {/* ── Gantt / Timeline ── */}
      {calView === 'gantt' && <SuccessionGantt />}

      {/* ── Schedule ── */}
      {calView === 'schedule' && (
        <>
          {!hasTasks && (
            <div className="alert alert-info">
              Place plants in the Garden Planner to auto-generate your schedule.
            </div>
          )}

          {/* Month picker */}
          <div className="calendar-header">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                className={`month-chip${i === activeMonth ? ' active' : ''}`}
                onClick={() => setActiveMonth(i)}
              >
                {m}
              </button>
            ))}
          </div>

          {monthTasks.length > 0 && (
            <div className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
              {completedCount}/{monthTasks.length} tasks complete for {MONTHS[activeMonth]}
            </div>
          )}

          {monthTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <h3>Nothing scheduled for {MONTHS[activeMonth]}</h3>
              <p>
                {hasTasks
                  ? 'No tasks fall in this month based on your current planting plan.'
                  : 'Add plants in the Garden Planner to generate a schedule.'}
              </p>
            </div>
          ) : (
            Array.from(weekGroups.entries()).map(([weekLabel, weekTasks]) => (
              <div key={weekLabel} className="week-group">
                <div className="week-heading">{weekLabel}</div>
                <div className="task-list">
                  {weekTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={(id, completed) => void completeTask(id, completed)}
                      onDelete={(id) => void deleteTask(id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Add custom task */}
      {showAddTask && (
        <div className="modal-overlay" onClick={() => setShowAddTask(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-title">Add Custom Task</div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="e.g. Apply fertilizer to tomatoes"
                value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input type="date" className="form-input" value={newTask.date}
                onChange={(e) => setNewTask({ ...newTask, date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={newTask.type}
                onChange={(e) => setNewTask({ ...newTask, type: e.target.value as TaskType })}>
                {(Object.keys(TASK_LABELS) as TaskType[]).map((type) => (
                  <option key={type} value={type}>{TASK_LABELS[type]}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea className="form-textarea" placeholder="Any details…" rows={2}
                value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-ghost" onClick={() => setShowAddTask(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={() => void handleAddTask()} disabled={!newTask.title.trim()}>
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
