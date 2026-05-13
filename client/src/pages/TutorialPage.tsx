import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AUTH_ENABLED } from '../adapters';
import { useGardenStore } from '../store/useGardenStore';

// ── Step definitions ───────────────────────────────────────────

const STEPS = [
  { id: 'frost',     title: 'Your Growing Season',         emoji: '🌡️' },
  { id: 'bed',       title: 'Plan Your Raised Bed',         emoji: '🛏️' },
  { id: 'plants',    title: 'Add Plants to Your Bed',       emoji: '🌿' },
  { id: 'seeds',     title: 'Seed-Starting Dates',          emoji: '🌱' },
  { id: 'calendar',  title: 'Your Planting Calendar',       emoji: '📅' },
  { id: 'log',       title: 'Track Your Garden',            emoji: '📋' },
];

// ── Shared card styles ─────────────────────────────────────────

const demoCard: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: '12px',
  padding: '1.25rem',
  marginTop: '1.25rem',
};

// ══════════════════════════════════════════════════════════════
// Step demos
// ══════════════════════════════════════════════════════════════

function StepFrost() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={demoCard}>
      <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-primary-dark)' }}>
        Try it: look up frost dates
      </p>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          readOnly
          value="10001"
          className="form-input"
          style={{ maxWidth: '120px', fontFamily: 'monospace', fontSize: '1rem' }}
        />
        <button className="btn btn-primary" onClick={() => setRevealed(true)}>
          Look up →
        </button>
      </div>

      {revealed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeIn 0.3s ease' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '140px', background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#2e7d32', marginBottom: '0.25rem' }}>Last Spring Frost</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1b5e20' }}>Apr 15</div>
              <div style={{ fontSize: '0.75rem', color: '#388e3c', marginTop: '0.2rem' }}>safe to transplant after this</div>
            </div>
            <div style={{ flex: 1, minWidth: '140px', background: '#fff3e0', border: '1px solid #ffcc80', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#e65100', marginBottom: '0.25rem' }}>First Fall Frost</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#bf360c' }}>Oct 15</div>
              <div style={{ fontSize: '0.75rem', color: '#e65100', marginTop: '0.2rem' }}>harvest warm crops before this</div>
            </div>
          </div>
          <div style={{ background: '#f4faf4', borderRadius: '8px', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>Growing season</div>
            <div style={{ height: '12px', background: '#e0e0e0', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '31%', right: '22%', top: 0, bottom: 0, background: 'linear-gradient(90deg, #81c784, #4caf50, #388e3c)', borderRadius: '6px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
              <span>Jan</span><span>Apr 15</span><span>Oct 15</span><span>Dec</span>
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary-dark)', marginTop: '0.4rem', textAlign: 'center' }}>183-day growing season</div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Every seed-starting and transplant date in the app is calculated from these two dates. You can override them any time with your own local knowledge.
          </p>
        </div>
      )}
    </div>
  );
}

const BED_SIZES = [
  { label: '4 × 4 ft', cols: 4, rows: 4 },
  { label: '4 × 8 ft', cols: 8, rows: 4 },
  { label: '3 × 6 ft', cols: 6, rows: 3 },
];
const SUN_DIRS = ['N→S', 'E→W', 'NE→SW', 'NW→SE'];

function StepBed() {
  const [sizeIdx, setSizeIdx] = useState(1);
  const [sunIdx, setSunIdx] = useState(0);
  const size = BED_SIZES[sizeIdx];

  return (
    <div style={demoCard}>
      <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-primary-dark)' }}>
        Try it: configure a bed
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {BED_SIZES.map((s, i) => (
          <button
            key={s.label}
            onClick={() => setSizeIdx(i)}
            className={`btn btn-sm ${sizeIdx === i ? 'btn-primary' : 'btn-ghost'}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>Rows run:</span>
        {SUN_DIRS.map((d, i) => (
          <button
            key={d}
            onClick={() => setSunIdx(i)}
            className={`btn btn-sm ${sunIdx === i ? 'btn-secondary' : 'btn-ghost'}`}
          >
            ☀️ {d}
          </button>
        ))}
      </div>

      {/* Mini bed grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${size.cols}, 1fr)`,
        gap: '3px',
        background: '#8d6e63',
        padding: '6px',
        borderRadius: '8px',
        maxWidth: '320px',
      }}>
        {Array.from({ length: size.rows * size.cols }).map((_, i) => (
          <div key={i} style={{
            aspectRatio: '1',
            background: '#c8e6c9',
            borderRadius: '3px',
            border: '1px solid #a5d6a7',
          }} />
        ))}
      </div>

      <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
        {size.cols * size.rows} sq ft total · rows run {SUN_DIRS[sunIdx]} so taller plants don't shade shorter ones
      </div>
    </div>
  );
}

const DEMO_PLANTS = [
  { name: 'Tomato',   emoji: '🍅', density: 1, color: '#ef9a9a' },
  { name: 'Lettuce',  emoji: '🥬', density: 4, color: '#a5d6a7' },
  { name: 'Carrot',   emoji: '🥕', density: 16, color: '#ffcc80' },
  { name: 'Basil',    emoji: '🌿', density: 4, color: '#c5e1a5' },
  { name: 'Cucumber', emoji: '🥒', density: 1, color: '#b2dfdb' },
  { name: 'Pepper',   emoji: '🌶️', density: 1, color: '#ffab91' },
];

function StepPlants() {
  const [selected, setSelected] = useState(0);
  const [placed, setPlaced] = useState<Record<number, number>>({});
  const COLS = 4;
  const ROWS = 4;

  function place(i: number) {
    setPlaced(prev => prev[i] === selected ? { ...prev, [i]: -1 } : { ...prev, [i]: selected });
  }

  const plant = DEMO_PLANTS[selected];

  return (
    <div style={demoCard}>
      <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-primary-dark)' }}>
        Try it: select a plant, click cells to place it
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        {DEMO_PLANTS.map((p, i) => (
          <button
            key={p.name}
            onClick={() => setSelected(i)}
            className={`btn btn-sm ${selected === i ? 'btn-primary' : 'btn-ghost'}`}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            {p.emoji} {p.name}
          </button>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, 1fr)`,
        gap: '4px',
        background: '#8d6e63',
        padding: '6px',
        borderRadius: '8px',
        maxWidth: '260px',
        marginBottom: '0.75rem',
      }}>
        {Array.from({ length: ROWS * COLS }).map((_, i) => {
          const pIdx = placed[i] ?? -1;
          const p = pIdx >= 0 ? DEMO_PLANTS[pIdx] : null;
          return (
            <div
              key={i}
              onClick={() => place(i)}
              style={{
                aspectRatio: '1',
                background: p ? p.color : '#c8e6c9',
                borderRadius: '4px',
                border: `2px solid ${p ? '#555' : '#a5d6a7'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                transition: 'background 0.15s',
              }}
            >
              {p ? p.emoji : ''}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
        {plant.name} spacing: {plant.density} per sq ft
        {Object.values(placed).filter(v => v === selected).length > 0 && (
          <span style={{ color: 'var(--color-primary)', fontWeight: 600, marginLeft: '0.5rem' }}>
            · {Object.values(placed).filter(v => v === selected).length} placed
          </span>
        )}
      </div>
    </div>
  );
}

const SEED_PLANTS = [
  { name: 'Pepper',  emoji: '🌶️', weeksBeforeFrost: 10, startDate: 'Feb 3',  transplant: 'Apr 15', harvest: 'Aug–Oct' },
  { name: 'Tomato',  emoji: '🍅', weeksBeforeFrost: 7,  startDate: 'Feb 24', transplant: 'Apr 15', harvest: 'Jul–Sep' },
  { name: 'Lettuce', emoji: '🥬', weeksBeforeFrost: 4,  startDate: 'Mar 18', transplant: 'Apr 8',  harvest: 'May–Jun' },
  { name: 'Cucumber',emoji: '🥒', weeksBeforeFrost: 2,  startDate: 'Apr 1',  transplant: 'Apr 15', harvest: 'Jul–Sep' },
];

function StepSeeds() {
  const [selected, setSelected] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const p = SEED_PLANTS[selected];

  function select(i: number) {
    setSelected(i);
    setRevealed(false);
  }

  return (
    <div style={demoCard}>
      <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-primary-dark)' }}>
        Try it: see how a plant drives its start date
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {SEED_PLANTS.map((pl, i) => (
          <button
            key={pl.name}
            onClick={() => select(i)}
            className={`btn btn-sm ${selected === i ? 'btn-primary' : 'btn-ghost'}`}
          >
            {pl.emoji} {pl.name}
          </button>
        ))}
      </div>

      <div style={{ background: '#f4faf4', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.35rem' }}>
          {p.emoji} {p.name} needs <strong>{p.weeksBeforeFrost} weeks</strong> indoors before last frost (Apr 15)
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
          Apr 15 − {p.weeksBeforeFrost} weeks = <strong style={{ color: 'var(--color-primary-dark)' }}>start seeds {p.startDate}</strong>
        </div>
      </div>

      <button className="btn btn-secondary btn-sm" onClick={() => setRevealed(true)} style={{ marginBottom: '0.75rem' }}>
        Show full timeline →
      </button>

      {revealed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', animation: 'fadeIn 0.3s ease' }}>
          {[
            { label: `🌱 Start seeds indoors`, date: p.startDate, color: '#81c784' },
            { label: `🪟 Harden off seedlings`, date: `~${p.transplant.replace('Apr', 'Apr').replace('Mar', 'Mar')} (1 wk before)`, color: '#aed581' },
            { label: `🌿 Transplant outside`, date: p.transplant, color: '#4caf50' },
            { label: `🎉 Harvest window`, date: p.harvest, color: '#ff8a65' },
          ].map((m, i, arr) => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: m.color, border: '2px solid white', boxShadow: '0 0 0 2px var(--color-border)', marginTop: '4px', flexShrink: 0 }} />
                {i < arr.length - 1 && <div style={{ width: '2px', height: '28px', background: 'var(--color-border)' }} />}
              </div>
              <div style={{ paddingBottom: i < arr.length - 1 ? '0.25rem' : 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>{m.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{m.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CALENDAR_MONTHS = ['February', 'March', 'April', 'May', 'June', 'July'];
const CALENDAR_TASKS: Record<string, { label: string; color: string }[]> = {
  February: [
    { label: '🌶️ Start pepper seeds (Feb 3)', color: '#ef9a9a' },
    { label: '🍅 Start tomato seeds (Feb 24)', color: '#ef9a9a' },
  ],
  March: [
    { label: '🥬 Start lettuce seeds (Mar 18)', color: '#a5d6a7' },
    { label: '🌶️ Repot pepper seedlings', color: '#ef9a9a' },
  ],
  April: [
    { label: '🥒 Start cucumber seeds (Apr 1)', color: '#b2dfdb' },
    { label: '🥬 Transplant lettuce (Apr 8)', color: '#a5d6a7' },
    { label: '🍅🌶️🥒 Transplant all after Apr 15', color: '#c5e1a5' },
  ],
  May: [
    { label: '🥬 Lettuce harvest begins', color: '#66bb6a' },
    { label: '🌿 Succession: start lettuce #2', color: '#a5d6a7' },
  ],
  June: [
    { label: '🥒 Cucumber harvest begins', color: '#80cbc4' },
    { label: '🥬 Start fall lettuce', color: '#a5d6a7' },
  ],
  July: [
    { label: '🍅 Tomato harvest begins', color: '#ef5350' },
    { label: '🌶️ Pepper harvest begins', color: '#ff8a65' },
  ],
};

function StepCalendar() {
  const [month, setMonth] = useState('April');
  const tasks = CALENDAR_TASKS[month] ?? [];

  return (
    <div style={demoCard}>
      <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-primary-dark)' }}>
        Try it: browse your season schedule
      </p>

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {CALENDAR_MONTHS.map(m => (
          <button
            key={m}
            onClick={() => setMonth(m)}
            className={`btn btn-sm ${month === m ? 'btn-primary' : 'btn-ghost'}`}
          >
            {m}
          </button>
        ))}
      </div>

      <div style={{ minHeight: '120px' }}>
        {tasks.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Nothing scheduled this month.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {tasks.map(t => (
              <div key={t.label} style={{
                background: t.color + '33',
                border: `1px solid ${t.color}99`,
                borderLeft: `4px solid ${t.color}`,
                borderRadius: '6px',
                padding: '0.5rem 0.75rem',
                fontSize: '0.85rem',
                color: 'var(--color-text)',
              }}>
                {t.label}
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
        The full calendar generates automatically when you add plants to your beds — and updates whenever your plan changes.
      </p>
    </div>
  );
}

const LOG_BUTTONS = [
  { label: 'Watered',     emoji: '💧', color: '#64b5f6' },
  { label: 'Fertilized',  emoji: '🧪', color: '#ba68c8' },
  { label: 'Harvested',   emoji: '🧺', color: '#66bb6a' },
  { label: 'Observed',    emoji: '🔍', color: '#ffb74d' },
  { label: 'Treated',     emoji: '🐛', color: '#ef9a9a' },
];

function StepLog() {
  const [entries, setEntries] = useState<{ label: string; emoji: string; color: string; time: string }[]>([]);

  function addEntry(btn: typeof LOG_BUTTONS[number]) {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setEntries(prev => [{ ...btn, time }, ...prev].slice(0, 5));
  }

  return (
    <div style={demoCard}>
      <p style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--color-primary-dark)' }}>
        Try it: log a garden activity
      </p>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {LOG_BUTTONS.map(btn => (
          <button
            key={btn.label}
            className="btn btn-secondary btn-sm"
            onClick={() => addEntry(btn)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            {btn.emoji} {btn.label}
          </button>
        ))}
      </div>

      <div style={{ minHeight: '80px' }}>
        {entries.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Tap an action above to log it.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {entries.map((e, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'var(--color-surface-alt)',
                borderRadius: '6px',
                padding: '0.4rem 0.6rem',
                fontSize: '0.84rem',
                animation: i === 0 ? 'fadeIn 0.25s ease' : undefined,
              }}>
                <span style={{ fontSize: '1.1rem' }}>{e.emoji}</span>
                <span style={{ flex: 1, fontWeight: 600, color: 'var(--color-text)' }}>{e.label}</span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Today {e.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
        One tap from anywhere in the app. Over a season you build a complete picture of what worked — and what to do differently next year.
      </p>
    </div>
  );
}

// ── Step content ───────────────────────────────────────────────

const STEP_CONTENT = [
  {
    heading: 'Your frost dates drive everything',
    body: `Before you plant a single seed, My Living Garden looks up your local last spring frost
and first fall frost dates from your zip code. These two dates are the anchor for every
calculation in the app — when to start seeds indoors, when it's safe to transplant, and
when your growing season ends.`,
    tip: 'You can override the auto-detected dates any time with your own local knowledge.',
    demo: <StepFrost />,
  },
  {
    heading: 'Size, orientation, and sunlight',
    body: `Add beds one at a time and set their dimensions. Orientation matters: rows running
north-to-south let sunlight reach plants on both sides of each row, while east-to-west
rows can leave shorter plants in the shade of taller neighbours. Most beds work best
with rows running N→S.`,
    tip: 'The standard 4×8 ft bed is the most versatile size — you can reach the center from either side without stepping in.',
    demo: <StepBed />,
  },
  {
    heading: 'Drop plants onto your grid',
    body: `Each square in the bed grid represents one square foot. Select a plant from the
catalog and click any cell to place it. The planner tells you how many plants fit per
square foot based on mature spacing — tomatoes get 1 per square, lettuce gets 4,
carrots get 16.`,
    tip: 'Companion planting suggestions appear as you build — basil near tomatoes, marigolds at bed edges, and more.',
    demo: <StepPlants />,
  },
  {
    heading: 'The app does the date math',
    body: `The moment you place a plant that needs indoor starting, My Living Garden calculates
its seed-starting date by counting backwards from your last frost date. Peppers need
10 weeks, so they start in early February. Cucumbers need only 2, so they start in
early April. You never have to count backwards from a calendar again.`,
    tip: 'Crops that are best direct-sown (beans, carrots, squash) skip the indoor phase entirely and go straight to a direct-sow date.',
    demo: <StepSeeds />,
  },
  {
    heading: 'One auto-generated season schedule',
    body: `Your planting calendar builds itself from your bed layout. It shows indoor starts,
transplant dates, and harvest windows side by side so you can see the whole season
at once. Stagger the same crop across a few weeks — the calendar makes gaps obvious
so you can fill them with succession plantings.`,
    tip: 'The calendar updates automatically whenever you add, move, or remove a plant from your beds.',
    demo: <StepCalendar />,
  },
  {
    heading: 'A one-tap activity log',
    body: `Log waterings, harvests, fertilising, and observations in one tap from any page in the
app. Over a season you build a genuine record of what you grew, how much you harvested,
and what needed attention. That record becomes your personalised playbook for next year.`,
    tip: 'Harvest weights are optional but worth logging — after one season you\'ll know exactly how much space each crop is worth.',
    demo: <StepLog />,
  },
];

// ══════════════════════════════════════════════════════════════
// Main page
// ══════════════════════════════════════════════════════════════

export function TutorialPage() {
  useEffect(() => {
    const el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (el) el.href = 'https://mylivinggarden.com/tutorial';
    document.title = 'Interactive Garden Planning Tutorial — My Living Garden';
  }, []);

  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { settings } = useGardenStore();
  const content = STEP_CONTENT[step];
  const total = STEPS.length;

  const isLast = step === total - 1;

  function finish() {
    if (settings.setupComplete) {
      navigate('/dashboard');
    } else {
      navigate('/setup');
    }
  }

  return (
    <div className="landing">

      {/* ── Nav ────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-nav-brand" style={{ textDecoration: 'none' }}>
            <span className="landing-nav-logo">🌿</span>
            <span className="landing-nav-name">My Living Garden</span>
          </Link>
          {settings.setupComplete ? (
            <Link to="/dashboard" className="btn btn-primary landing-nav-cta">My garden →</Link>
          ) : AUTH_ENABLED ? (
            <a href="/auth/google" className="btn btn-primary landing-nav-cta">Sign in →</a>
          ) : (
            <Link to="/setup" className="btn btn-primary landing-nav-cta">Start free →</Link>
          )}
        </div>
      </header>

      {/* ── Step indicator ─────────────────────────────────────── */}
      <div style={{ background: 'var(--color-surface-alt)', borderBottom: '1px solid var(--color-border)', padding: '1rem 1.25rem' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          {/* Progress bar */}
          <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: '2px', marginBottom: '0.75rem', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'var(--color-primary)', borderRadius: '2px', width: `${((step + 1) / total) * 100}%`, transition: 'width 0.3s ease' }} />
          </div>

          {/* Step pills */}
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '2px' }}>
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setStep(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.3rem 0.65rem',
                  borderRadius: '999px',
                  border: '1px solid',
                  fontSize: '0.78rem',
                  fontWeight: i === step ? 700 : 400,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: i === step ? 'var(--color-primary)' : i < step ? 'var(--color-primary-light, #e8f5e9)' : 'var(--color-surface)',
                  borderColor: i === step ? 'var(--color-primary)' : i < step ? 'var(--color-primary)' : 'var(--color-border)',
                  color: i === step ? '#fff' : i < step ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                {i < step ? '✓' : s.emoji} {s.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Step body ──────────────────────────────────────────── */}
      <section className="landing-section" style={{ minHeight: '60vh' }}>
        <div className="landing-section-inner" style={{ maxWidth: '720px' }}>

          <div style={{ marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Step {step + 1} of {total} · {STEPS[step].emoji} {STEPS[step].title}
          </div>

          <h2 className="landing-section-h2" style={{ textAlign: 'left', marginBottom: '0.75rem' }}>
            {content.heading}
          </h2>

          <p style={{ color: 'var(--color-text)', lineHeight: 1.75, margin: 0, whiteSpace: 'pre-line' }}>
            {content.body}
          </p>

          {/* Interactive demo */}
          {content.demo}

          {/* Pro tip */}
          <div style={{
            marginTop: '1rem',
            background: '#f0f9f0',
            border: '1px solid #c8e6c9',
            borderLeft: '4px solid var(--color-primary)',
            borderRadius: '6px',
            padding: '0.65rem 0.9rem',
            fontSize: '0.83rem',
            color: 'var(--color-text)',
          }}>
            <strong style={{ color: 'var(--color-primary-dark)' }}>Tip: </strong>{content.tip}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.75rem', gap: '1rem' }}>
            <button
              className="btn btn-ghost"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              ← Previous
            </button>

            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {step + 1} / {total}
            </span>

            {isLast ? (
              <button className="btn btn-primary" onClick={finish}>
                {settings.setupComplete ? '🌿 Go to my garden →' : '🌱 Start planning →'}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>
                Next →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand"><span>🌿</span> My Living Garden</div>
          <div className="landing-footer-links">
            <Link to="/">Home</Link>
            <Link to="/guide">Guide</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </div>
          <div className="landing-footer-copy">© {new Date().getFullYear()} My Living Garden</div>
        </div>
      </footer>

    </div>
  );
}
