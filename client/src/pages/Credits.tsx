import { Link } from 'react-router-dom';

const LAST_UPDATED = 'April 2025';

export function Credits() {
  return (
    <div className="legal-page">
      <div className="legal-container">

        <div className="legal-back">
          <Link to="/" className="btn btn-ghost btn-sm">← Back</Link>
        </div>

        <div className="legal-logo">🙏</div>
        <h1 className="legal-title">Credits & Licenses</h1>
        <p className="legal-meta">My Living Garden · Last updated {LAST_UPDATED}</p>

        <div className="legal-body">

          <p>
            My Living Garden is built on the shoulders of great open-source work and
            talented creators. This page attributes everything we use and the license
            under which it's used.
          </p>

          {/* ── 3D Models ─────────────────────────────────────── */}
          <h2>3D Models</h2>

          <div className="credits-asset">
            <div className="credits-asset-title">Tomato Plant</div>
            <div className="credits-asset-meta">
              <span className="credits-badge credits-badge--cc">CC BY 4.0</span>
            </div>
            <table className="credits-table">
              <tbody>
                <tr><th>Author</th><td><a href="https://sketchfab.com/zvanstone" target="_blank" rel="noopener noreferrer">zvanstone</a></td></tr>
                <tr><th>Source</th><td><a href="https://sketchfab.com/3d-models/tomato-plant-e0b559690e384fc0a9f3a05913f609c4" target="_blank" rel="noopener noreferrer">Sketchfab — Tomato Plant</a></td></tr>
                <tr><th>License</th><td><a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 4.0 (CC BY 4.0)</a></td></tr>
                <tr><th>Changes</th><td>File converted to GLB format for web delivery; no geometry or texture modifications.</td></tr>
              </tbody>
            </table>
          </div>

          <div className="credits-note">
            All other plant representations in the 3D view are procedurally generated
            geometry — no third-party models. Future models will be listed here with
            full attribution before they ship.
          </div>

          {/* ── Open Source Libraries ─────────────────────────── */}
          <h2>Open Source Libraries</h2>
          <p>
            My Living Garden is built with the following open-source packages, each used
            under their respective licenses (MIT unless noted):
          </p>

          <table className="credits-table credits-table--libs">
            <thead>
              <tr><th>Package</th><th>License</th><th>Use</th></tr>
            </thead>
            <tbody>
              <tr><td><a href="https://react.dev" target="_blank" rel="noopener noreferrer">React</a></td><td>MIT</td><td>UI framework</td></tr>
              <tr><td><a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">Vite</a></td><td>MIT</td><td>Build tool &amp; dev server</td></tr>
              <tr><td><a href="https://threejs.org" target="_blank" rel="noopener noreferrer">Three.js</a></td><td>MIT</td><td>3D garden view</td></tr>
              <tr><td><a href="https://github.com/pmndrs/zustand" target="_blank" rel="noopener noreferrer">Zustand</a></td><td>MIT</td><td>State management</td></tr>
              <tr><td><a href="https://dexie.org" target="_blank" rel="noopener noreferrer">Dexie.js</a></td><td>Apache 2.0</td><td>IndexedDB wrapper</td></tr>
              <tr><td><a href="https://reactrouter.com" target="_blank" rel="noopener noreferrer">React Router</a></td><td>MIT</td><td>Client-side routing</td></tr>
              <tr><td><a href="https://vite-pwa-org.netlify.app" target="_blank" rel="noopener noreferrer">vite-plugin-pwa</a></td><td>MIT</td><td>Progressive Web App support</td></tr>
            </tbody>
          </table>

          {/* ── Data Sources ──────────────────────────────────── */}
          <h2>Data Sources</h2>

          <table className="credits-table credits-table--libs">
            <thead>
              <tr><th>Service</th><th>License / Terms</th><th>Use</th></tr>
            </thead>
            <tbody>
              <tr>
                <td><a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo</a></td>
                <td><a href="https://open-meteo.com/en/terms" target="_blank" rel="noopener noreferrer">CC BY 4.0</a></td>
                <td>7-day weather forecasts</td>
              </tr>
              <tr>
                <td><a href="https://nominatim.openstreetmap.org" target="_blank" rel="noopener noreferrer">OpenStreetMap Nominatim</a></td>
                <td><a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer">ODbL</a></td>
                <td>ZIP code → coordinates</td>
              </tr>
            </tbody>
          </table>

          {/* ── App License ───────────────────────────────────── */}
          <h2>This Application</h2>
          <p>
            My Living Garden's source code and design are proprietary and owned by the
            creator. No part of this application may be reproduced, distributed, or used
            as the basis of another product without explicit written permission.
          </p>
          <p>
            The app is provided free of charge for personal use. See our{' '}
            <Link to="/terms">Terms of Service</Link> for full usage terms.
            Questions? <a href="mailto:support@mylivinggarden.com">support@mylivinggarden.com</a>
          </p>

        </div>

        <div className="legal-footer-links">
          <Link to="/terms">Terms of Service</Link>
          <span>·</span>
          <Link to="/privacy">Privacy Policy</Link>
          <span>·</span>
          <Link to="/">Back to App</Link>
        </div>

      </div>
    </div>
  );
}
