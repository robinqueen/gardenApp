import { Link } from 'react-router-dom';

const LAST_UPDATED = 'April 2025';

export function PrivacyPolicy() {
  return (
    <div className="legal-page">
      <div className="legal-container">

        <div className="legal-back">
          <Link to="/" className="btn btn-ghost btn-sm">← Back</Link>
        </div>

        <div className="legal-logo">🌿</div>
        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-meta">My Living Garden · Last updated {LAST_UPDATED}</p>

        <div className="legal-body">

          <p>
            My Living Garden is a personal garden planning tool. This policy explains what
            information the app uses and why.
          </p>

          <h2>1. Your Garden Data</h2>
          <p>
            Everything you enter into the app — your beds, plants, tasks, and notes — is
            stored <strong>on your device only</strong>. It is never transmitted to us or
            any server we operate. We have no access to your garden data.
          </p>
          <p>
            You can export a copy at any time via <em>Settings → Export Backup</em>, or
            delete everything via <em>Settings → Reset Everything</em>.
          </p>

          <h2>2. Usage Analytics</h2>
          <p>
            We use a third-party analytics service to understand how many people use the app
            and which features are most useful. This helps us decide what to build next.
          </p>
          <p>
            The analytics we collect are <strong>anonymous and aggregate</strong> — we can
            see that someone visited a page, not who they are. No personal information is
            linked to these records. IP addresses are anonymized before storage.
          </p>
          <p>
            If you prefer not to be counted, any standard ad or tracker blocker will prevent
            analytics from firing.
          </p>

          <h2>3. Weather & Location</h2>
          <p>
            If you enter a zip code, the app uses it to look up local weather forecasts and
            estimate your frost dates. To do this, your zip code is converted to approximate
            coordinates, and those coordinates are sent to a weather service. No other
            personal information is included in these requests.
          </p>
          <p>
            Your zip code and coordinates are cached on your device to avoid unnecessary
            repeated lookups.
          </p>

          <h2>4. No Accounts, No Email, No Tracking</h2>
          <p>
            The app does not require an account, email address, or login of any kind.
            We do not sell data, serve ads, or build any profile tied to you personally.
          </p>

          <h2>5. Infrastructure</h2>
          <p>
            The app is delivered over the internet using standard web hosting and security
            infrastructure. Like any website, basic connection metadata (such as IP addresses)
            may be processed by these services in the course of handling your requests. We do
            not control or store this data ourselves.
          </p>

          <h2>6. Changes to This Policy</h2>
          <p>
            If we change what data we collect or how we use it, we'll update this page and
            the "Last updated" date above.
          </p>

          <h2>7. Contact</h2>
          <p>
            Privacy questions? Email us at{' '}
            <a href="mailto:support@mylivinggarden.com">support@mylivinggarden.com</a>.
          </p>

        </div>

        <div className="legal-footer-links">
          <Link to="/terms">Terms of Service</Link>
          <span>·</span>
          <Link to="/credits">Credits &amp; Licenses</Link>
          <span>·</span>
          <Link to="/">Back to App</Link>
        </div>

      </div>
    </div>
  );
}
