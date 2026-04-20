import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AUTH_ENABLED } from '../adapters';

const TOC = [
  { id: 'frost-dates',         label: 'Know your frost dates' },
  { id: 'what-to-grow',        label: 'Decide what to grow' },
  { id: 'plan-your-beds',      label: 'Plan your raised beds' },
  { id: 'seed-starting',       label: 'Calculate seed-starting dates' },
  { id: 'planting-calendar',   label: 'Build a planting calendar' },
  { id: 'succession-planting', label: 'Use succession planting' },
  { id: 'track-results',       label: 'Track your results' },
];

export function GuidePage() {
  useEffect(() => {
    const el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (el) el.href = 'https://mylivinggarden.com/guide';
    document.title = 'How to Plan a Vegetable Garden — My Living Garden';
  }, []);

  const ctaHref = AUTH_ENABLED ? '/auth/google' : '/setup';
  const ctaLabel = AUTH_ENABLED ? 'Sign in with Google →' : 'Start planning for free →';

  return (
    <div className="landing">

      {/* ── Nav ──────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Link to="/" className="landing-nav-brand" style={{ textDecoration: 'none' }}>
            <span className="landing-nav-logo">🌿</span>
            <span className="landing-nav-name">My Living Garden</span>
          </Link>
          {AUTH_ENABLED ? (
            <a href={ctaHref} className="btn btn-primary landing-nav-cta">{ctaLabel}</a>
          ) : (
            <Link to="/setup" className="btn btn-primary landing-nav-cta">{ctaLabel}</Link>
          )}
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="landing-hero" style={{ padding: '3rem 1.25rem 2rem' }}>
        <div className="landing-hero-inner">
          <div className="landing-hero-eyebrow">Garden Planning Guide · 2026</div>
          <h1 className="landing-hero-h1" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}>
            How to Plan a Vegetable Garden:<br />A Complete Beginner's Guide
          </h1>
          <p className="landing-hero-sub">
            Whether you're starting your first raised bed or scaling up to a full backyard plot,
            a little planning goes a long way. This guide walks you through every step — from
            understanding your frost dates to scheduling succession plantings — so you can grow
            more food with less guesswork.
          </p>
          <div className="landing-hero-tags">
            <span className="landing-tag">Frost dates</span>
            <span className="landing-tag">Raised beds</span>
            <span className="landing-tag">Seed starting</span>
            <span className="landing-tag">Planting calendar</span>
            <span className="landing-tag">Succession planting</span>
            <span className="landing-tag">Harvest tracking</span>
          </div>
        </div>
      </section>

      {/* ── Table of contents ────────────────────────────────────── */}
      <section className="landing-section landing-section--alt" style={{ padding: '1.5rem 1.25rem' }}>
        <div className="landing-section-inner">
          <p style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-primary-dark)' }}>
            In this guide:
          </p>
          <ol style={{ margin: 0, paddingLeft: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.3rem 2rem' }}>
            {TOC.map((item) => (
              <li key={item.id} style={{ fontSize: '0.9rem' }}>
                <a href={`#${item.id}`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Article body ─────────────────────────────────────────── */}
      <article className="landing-section">
        <div className="landing-section-inner" style={{ maxWidth: '720px' }}>

          {/* 1 */}
          <section id="frost-dates" style={{ marginBottom: '3rem' }}>
            <h2 className="landing-section-h2" style={{ textAlign: 'left' }}>
              1. Know Your Frost Dates
            </h2>
            <p className="landing-section-sub" style={{ textAlign: 'left', marginBottom: '1rem' }}>
              Every vegetable garden revolves around two dates: your <strong>last spring frost</strong> and
              your <strong>first fall frost</strong>. These define your growing season and set the clock
              for every seed-starting and transplant decision you'll make.
            </p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text)' }}>
              <li><strong>Last spring frost</strong> — the date after which you're safe to put frost-sensitive crops outside.</li>
              <li><strong>First fall frost</strong> — the date that ends most warm-season crops like tomatoes and squash.</li>
            </ul>
            <p style={{ marginTop: '1rem', color: 'var(--color-text)', lineHeight: 1.7 }}>
              To find your dates, search "[your city] average last frost date" or look up your USDA
              hardiness zone. In My Living Garden, you enter your zip code once and the app looks up
              both dates automatically — and you can override them any time with your own local knowledge.
            </p>
            <p style={{ marginTop: '1rem', color: 'var(--color-text)', lineHeight: 1.7 }}>
              Warm-season crops like tomatoes, peppers, cucumbers, and squash go out <em>after</em> your
              last frost. Cool-season crops like lettuce, spinach, broccoli, and peas can handle light
              frost and are often planted 4–6 weeks before it — giving you a head start on the season.
            </p>
          </section>

          {/* 2 */}
          <section id="what-to-grow" style={{ marginBottom: '3rem' }}>
            <h2 className="landing-section-h2" style={{ textAlign: 'left' }}>
              2. Decide What to Grow
            </h2>
            <p style={{ color: 'var(--color-text)', lineHeight: 1.7, marginBottom: '1rem' }}>
              Before you map a single bed, make a list. The best gardens are built around what
              your household actually eats — not what looks exciting in a catalog.
            </p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text)' }}>
              <li><strong>What you eat</strong> — don't grow 10 zucchini plants if you only like one or two.</li>
              <li><strong>What grows in your zone</strong> — some crops need long hot summers; others thrive in cool, short seasons.</li>
              <li><strong>Difficulty level</strong> — salad greens, radishes, and beans are forgiving for beginners. Celery, artichokes, and melons are not.</li>
              <li><strong>Days to maturity vs. your season length</strong> — a crop that needs 90 days won't make it if your frost-free window is only 100 days.</li>
            </ul>
            <p style={{ marginTop: '1rem', color: 'var(--color-text)', lineHeight: 1.7 }}>
              A solid beginner garden: tomatoes, cucumbers, lettuce, green beans, basil, and radishes.
              That's a full season of fresh food without overwhelming complexity.
            </p>
            <p style={{ marginTop: '1rem', color: 'var(--color-text)', lineHeight: 1.7 }}>
              Browse My Living Garden's seed catalog to see days-to-harvest, spacing requirements, and
              frost tolerance for hundreds of vegetable and herb varieties before you commit to a plan.
            </p>
          </section>

          {/* 3 */}
          <section id="plan-your-beds" style={{ marginBottom: '3rem' }}>
            <h2 className="landing-section-h2" style={{ textAlign: 'left' }}>
              3. Plan Your Raised Beds Before You Plant
            </h2>
            <p style={{ color: 'var(--color-text)', lineHeight: 1.7, marginBottom: '1rem' }}>
              Raised beds let you control soil quality, drainage, and layout. Sketch your beds
              before you plant to avoid the classic mistake: buying plants at the nursery and
              then figuring out where they go.
            </p>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '1rem 0 0.4rem', color: 'var(--color-primary-dark)' }}>
              Bed sizing basics
            </h3>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text)' }}>
              <li><strong>4 × 8 ft</strong> is the standard — you can reach the center from either side without stepping in and compacting soil.</li>
              <li><strong>Orientation</strong>: north-to-south rows let sunlight reach lower plants on the east and west sides.</li>
              <li><strong>Depth</strong>: 12 inches works for most crops; 18 inches for deep-rooted vegetables like carrots and parsnips.</li>
            </ul>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '1.25rem 0 0.4rem', color: 'var(--color-primary-dark)' }}>
              Plant spacing with square foot gardening
            </h3>
            <p style={{ color: 'var(--color-text)', lineHeight: 1.7 }}>
              Divide each bed into 1-foot squares and assign a plant density per square based on
              the crop's mature size:
            </p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text)' }}>
              <li>Tomatoes, peppers, broccoli — 1 per square</li>
              <li>Lettuce, spinach — 4 per square</li>
              <li>Beets, onions — 9 per square</li>
              <li>Carrots, radishes — 16 per square</li>
            </ul>
            <p style={{ marginTop: '1rem', color: 'var(--color-text)', lineHeight: 1.7 }}>
              My Living Garden's bed planner lets you drag and drop plants onto a grid, flags
              spacing violations automatically, and shows companion planting suggestions as you build.
            </p>
          </section>

          {/* 4 */}
          <section id="seed-starting" style={{ marginBottom: '3rem' }}>
            <h2 className="landing-section-h2" style={{ textAlign: 'left' }}>
              4. Calculate Your Seed-Starting Dates
            </h2>
            <p style={{ color: 'var(--color-text)', lineHeight: 1.7, marginBottom: '1rem' }}>
              Most vegetables are started indoors weeks before the last frost date. Starting
              too early produces leggy, overgrown seedlings; starting too late means you miss
              your transplant window and lose weeks of growing season.
            </p>
            <p style={{ color: 'var(--color-text)', lineHeight: 1.7, marginBottom: '1rem' }}>
              General indoor-start timelines (weeks before last frost):
            </p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text)' }}>
              <li><strong>Peppers</strong> — 8–10 weeks (they're slow; start these first)</li>
              <li><strong>Tomatoes</strong> — 6–8 weeks</li>
              <li><strong>Broccoli, cauliflower, cabbage</strong> — 4–6 weeks</li>
              <li><strong>Squash, melons</strong> — 2–3 weeks (they grow fast; don't start too early)</li>
              <li><strong>Cucumbers</strong> — 2–3 weeks, or direct-sow after frost (they resent transplanting)</li>
              <li><strong>Lettuce, herbs</strong> — 4–6 weeks, or direct-sow in the bed</li>
            </ul>
            <p style={{ marginTop: '1rem', color: 'var(--color-text)', lineHeight: 1.7 }}>
              Once you enter your frost date and add plants in My Living Garden, the app
              calculates every one of these dates for you — no spreadsheet required.
            </p>
          </section>

          {/* 5 */}
          <section id="planting-calendar" style={{ marginBottom: '3rem' }}>
            <h2 className="landing-section-h2" style={{ textAlign: 'left' }}>
              5. Build a Planting Calendar
            </h2>
            <p style={{ color: 'var(--color-text)', lineHeight: 1.7, marginBottom: '1rem' }}>
              A planting calendar is the single most useful tool you can have. It turns the
              chaos of "what do I do this week?" into a clear, week-by-week schedule for your
              entire growing season.
            </p>
            <p style={{ color: 'var(--color-text)', lineHeight: 1.7, marginBottom: '1rem' }}>
              A complete calendar shows:
            </p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text)' }}>
              <li>When to start each crop indoors</li>
              <li>When to harden off and transplant each seedling outside</li>
              <li>When to direct-sow seeds directly in the bed</li>
              <li>Expected harvest windows for each crop</li>
            </ul>
            <p style={{ marginTop: '1rem', color: 'var(--color-text)', lineHeight: 1.7 }}>
              The biggest payoff: staggering your plantings. If you start all your lettuce at
              once, you'll have 30 heads ready on the same day. Stagger starts by two weeks
              and you'll harvest continuously for months.
            </p>
            <p style={{ marginTop: '1rem', color: 'var(--color-text)', lineHeight: 1.7 }}>
              My Living Garden auto-generates your full planting calendar the moment you add
              plants to your beds — and updates it automatically whenever your plan changes.
            </p>
          </section>

          {/* 6 */}
          <section id="succession-planting" style={{ marginBottom: '3rem' }}>
            <h2 className="landing-section-h2" style={{ textAlign: 'left' }}>
              6. Use Succession Planting to Extend Your Harvest
            </h2>
            <p style={{ color: 'var(--color-text)', lineHeight: 1.7, marginBottom: '1rem' }}>
              <strong>Succession planting</strong> is the practice of planting the same crop
              multiple times a few weeks apart — or replacing a harvested crop with a new one —
              so you get a continuous harvest instead of a single glut.
            </p>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '1rem 0 0.4rem', color: 'var(--color-primary-dark)' }}>
              Same-crop staggering
            </h3>
            <p style={{ color: 'var(--color-text)', lineHeight: 1.7 }}>
              Plant a new row of lettuce every 2–3 weeks from early spring through mid-summer.
              As one planting bolts in the heat, the next one is just hitting peak harvest size.
            </p>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: '1.25rem 0 0.4rem', color: 'var(--color-primary-dark)' }}>
              Seasonal rotation
            </h3>
            <p style={{ color: 'var(--color-text)', lineHeight: 1.7 }}>
              The bigger win is filling beds between seasons:
            </p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text)' }}>
              <li>Spring lettuce finishes in May → replace with cucumber or beans for summer</li>
              <li>Cucumbers done in August → plant fall spinach or kale</li>
              <li>Early tomatoes pulled → sow a quick radish or arugula crop before frost</li>
            </ul>
            <p style={{ marginTop: '1rem', color: 'var(--color-text)', lineHeight: 1.7 }}>
              The key is knowing each crop's days-to-harvest and checking whether that fits
              your remaining frost-free window. My Living Garden's succession gap finder scans
              your bed schedule, shows you open windows, and suggests crops that can still
              mature before your first fall frost.
            </p>
          </section>

          {/* 7 */}
          <section id="track-results" style={{ marginBottom: '3rem' }}>
            <h2 className="landing-section-h2" style={{ textAlign: 'left' }}>
              7. Track Your Results Season Over Season
            </h2>
            <p style={{ color: 'var(--color-text)', lineHeight: 1.7, marginBottom: '1rem' }}>
              Your first garden will have surprises — some plants thrive, others struggle.
              The difference between a mediocre garden and a great one built up over years is
              simply noticing and recording what happened.
            </p>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--color-text)' }}>
              <li>Which tomato variety outperformed everything else?</li>
              <li>Did the corner of bed 2 stay too wet after rain?</li>
              <li>How much did you actually harvest — and was it worth the bed space?</li>
              <li>When did pests appear, and which crops were hit first?</li>
            </ul>
            <p style={{ marginTop: '1rem', color: 'var(--color-text)', lineHeight: 1.7 }}>
              Log quick notes through the season — a watering, a harvest weight, an observation
              about a plant struggling — and by October you'll have a genuine playbook for next
              year. My Living Garden's activity log makes this a one-tap action from anywhere
              in the app.
            </p>
          </section>

        </div>
      </article>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section className="landing-cta-section">
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🌱</div>
          <h2 className="landing-cta-h2">Ready to put this into practice?</h2>
          <p className="landing-cta-sub">
            My Living Garden handles frost dates, bed layout, seed-starting schedules,
            succession gaps, and harvest tracking — all in one free app, no account needed.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.25rem' }}>
            {AUTH_ENABLED ? (
              <a href="/auth/google" className="btn btn-primary landing-cta-primary">
                Sign in with Google →
              </a>
            ) : (
              <Link to="/setup" className="btn btn-primary landing-cta-primary">
                Start planning for free →
              </Link>
            )}
            <Link to="/tutorial" className="btn btn-secondary landing-cta-ghost">
              🎓 Interactive tutorial →
            </Link>
            <Link to="/seeds" className="btn btn-ghost landing-cta-ghost">
              Browse seed catalog →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <span>🌿</span> My Living Garden
          </div>
          <div className="landing-footer-links">
            <Link to="/">Home</Link>
            <Link to="/guide">Guide</Link>
            <Link to="/seeds">Seeds</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/credits">Credits</Link>
          </div>
          <div className="landing-footer-copy">
            © {new Date().getFullYear()} My Living Garden
          </div>
        </div>
      </footer>

    </div>
  );
}
