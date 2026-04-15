import { Link } from 'react-router-dom';

const LAST_UPDATED = 'April 2025';

export function TermsOfService() {
  return (
    <div className="legal-page">
      <div className="legal-container">

        <div className="legal-back">
          <Link to="/" className="btn btn-ghost btn-sm">← Back</Link>
        </div>

        <div className="legal-logo">🌿</div>
        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-meta">My Living Garden · Last updated {LAST_UPDATED}</p>

        <div className="legal-body">

          <p>
            Welcome to <strong>My Living Garden</strong> ("the App"). By using this app you
            agree to these terms. They're written to be readable — no legalese walls of text.
          </p>

          {/* ── Plain-English warning box ─────────────────────── */}
          <div className="legal-tldr">
            <strong>Important — please read before you start</strong>
            <ul>
              <li>⚠️ This app is in active development. Features, data formats, and the business model can change at any time without notice.</li>
              <li>💾 All your data lives in your browser only. It can be lost by clearing browser storage, switching browsers, reinstalling the app, or a future app update. Export backups regularly.</li>
              <li>🚧 Use this app at your own risk. We make no guarantees about uptime, data durability, or accuracy of planting schedules.</li>
            </ul>
          </div>

          <h2>1. What the App Is</h2>
          <p>
            My Living Garden is a free personal garden planning tool. It helps you plan raised
            beds, schedule seed starting, track harvests, and build planting calendars. It runs
            entirely in your browser — your data stays on your device.
          </p>

          <h2>2. Early-Stage Software — Expect Changes</h2>
          <p>
            This app is in active development. Changes happen continuously and without
            prior notice. At any time we may:
          </p>
          <ul>
            <li>Add, remove, or significantly change features</li>
            <li>Change the data model in ways that require a reset or re-setup</li>
            <li>Introduce optional paid tiers, accounts, or subscription features</li>
            <li>Take the app offline for maintenance or permanently discontinue it</li>
          </ul>
          <p>
            Do not rely on any feature or behavior remaining unchanged between sessions.
            This is early access software and should be treated as such.
          </p>

          <h2>3. Data Stored in Your Browser Only — Risk of Loss</h2>
          <p>
            All garden data is stored locally in your browser's <strong>IndexedDB</strong>.
            We do not back it up to any server. You can permanently and irreversibly lose all
            your data if you:
          </p>
          <ul>
            <li>Clear your browser's cookies, cache, or site data</li>
            <li>Uninstall or reinstall the app (PWA)</li>
            <li>Use a different browser or device</li>
            <li>Use a private / incognito window (data is wiped when the window closes)</li>
            <li>Your browser enforces storage eviction under low-disk conditions</li>
            <li>A future app update changes the internal database structure</li>
          </ul>
          <p>
            <strong>We strongly recommend exporting a backup regularly</strong> via{' '}
            <em>Settings → Export Backup</em>. We are not responsible for any data loss under
            any of the above circumstances.
          </p>

          <h2>4. Currently Free — Future Pricing Undetermined</h2>
          <p>
            The App is currently free to use and requires no account. My Living Garden is
            under active development and we have not yet determined how, or whether, it will
            ever be monetized. Possible futures include staying completely free, introducing
            optional paid features, or something else entirely — we genuinely don't know yet.
          </p>
          <p>
            What we commit to: we will not silently begin charging you. If pricing is ever
            introduced, it will be announced clearly and in advance. Using the app today does
            not create any expectation of free access in perpetuity.
          </p>

          <h2>5. No Warranty — Use at Your Own Risk</h2>
          <p>
            The App is provided <strong>"as is"</strong> and <strong>"as available"</strong>,
            without warranty of any kind, express or implied. This includes but is not limited to:
          </p>
          <ul>
            <li>No warranty of fitness for a particular purpose</li>
            <li>No warranty of accuracy — planting dates are estimates based on general frost data, not certified horticultural advice</li>
            <li>No warranty of uninterrupted or error-free operation</li>
            <li>No warranty that data will be preserved across updates</li>
          </ul>
          <p>
            Always cross-check planting schedules with your local agricultural extension office
            or your own growing experience. We are not responsible for crop failures, poor
            germination, or unexpected frost.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, My Living Garden and its
            creators shall not be liable for any indirect, incidental, special, consequential,
            or punitive damages — including but not limited to loss of data, loss of crops,
            loss of profits, or loss of goodwill — arising from your use of or inability to
            use the App. Our total aggregate liability to you for any claim is <strong>zero
            dollars ($0.00)</strong>, because you have paid nothing for this service.
          </p>

          <h2>7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Attempt to reverse-engineer, scrape, or exploit the app in ways that harm others</li>
            <li>Use automated tools to abuse the third-party APIs the app relies on (Open-Meteo, OpenStreetMap)</li>
            <li>Represent the app as your own product without permission</li>
          </ul>

          <h2>8. Third-Party Services</h2>
          <p>The App uses these external services to function:</p>
          <ul>
            <li><strong>Open-Meteo</strong> — weather forecasts (open-meteo.com). No personal data sent, only coordinates derived from your zip code.</li>
            <li><strong>OpenStreetMap Nominatim</strong> — geocoding zip codes to coordinates. No personal data sent beyond the zip code.</li>
            <li><strong>Google Analytics 4</strong> — anonymized page-view and feature-usage analytics. See our Privacy Policy for details.</li>
            <li><strong>Microsoft Clarity</strong> — anonymous heatmaps showing how users interact with the app. No personal data collected. See our Privacy Policy for details.</li>
          </ul>
          <p>
            We are not responsible for those services' uptime, accuracy, data practices, or
            changes to their APIs. Outages in any of these services may degrade app functionality.
          </p>

          <h2>9. Changes to These Terms</h2>
          <p>
            We may update these terms at any time. Changes take effect when posted, noted by
            the "Last updated" date above. Continued use of the App after changes constitutes
            acceptance. Nothing here will retroactively penalize you for something that was
            permitted when you did it.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions or concerns? Reach out at{' '}
            <a href="mailto:support@mylivinggarden.com">support@mylivinggarden.com</a>.
          </p>

        </div>

        <div className="legal-footer-links">
          <Link to="/privacy">Privacy Policy</Link>
          <span>·</span>
          <Link to="/credits">Credits &amp; Licenses</Link>
          <span>·</span>
          <Link to="/">Back to App</Link>
        </div>

      </div>
    </div>
  );
}
