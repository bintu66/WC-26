/**
 * Watch Match View
 * Embeds livekhela.tv in a full-screen in-app iframe with a professional toolbar.
 */

const WATCH_URL = 'https://livekhela.tv/';

export function renderWatchView(container) {
  container.innerHTML = '';

  const view = document.createElement('div');
  view.className = 'watch-view';

  // ── Toolbar ────────────────────────────────────────────────────────────────
  const toolbar = document.createElement('div');
  toolbar.className = 'watch-toolbar';

  const toolbarLeft = document.createElement('div');
  toolbarLeft.className = 'watch-toolbar-left';

  const tvIcon = document.createElement('span');
  tvIcon.className = 'watch-toolbar-icon';
  tvIcon.textContent = '📺';

  const toolbarTitle = document.createElement('div');
  toolbarTitle.className = 'watch-toolbar-title-group';

  const titleText = document.createElement('span');
  titleText.className = 'watch-toolbar-title';
  titleText.textContent = 'Watch Live';

  const subtitleText = document.createElement('span');
  subtitleText.className = 'watch-toolbar-subtitle';
  subtitleText.textContent = 'livekhela.tv • Free Streams';

  toolbarTitle.appendChild(titleText);
  toolbarTitle.appendChild(subtitleText);
  toolbarLeft.appendChild(tvIcon);
  toolbarLeft.appendChild(toolbarTitle);

  const toolbarRight = document.createElement('div');
  toolbarRight.className = 'watch-toolbar-actions';

  // Refresh button
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'watch-action-btn';
  refreshBtn.id = 'watch-refresh-btn';
  refreshBtn.title = 'Refresh player';
  refreshBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>`;

  // Open in browser button
  const openBtn = document.createElement('button');
  openBtn.className = 'watch-action-btn watch-action-btn--primary';
  openBtn.id = 'watch-open-btn';
  openBtn.title = 'Open in browser';
  openBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`;
  openBtn.innerHTML += `<span class="watch-open-label">Open</span>`;

  toolbarRight.appendChild(refreshBtn);
  toolbarRight.appendChild(openBtn);

  toolbar.appendChild(toolbarLeft);
  toolbar.appendChild(toolbarRight);
  view.appendChild(toolbar);

  // ── Live badge strip ───────────────────────────────────────────────────────
  const liveBadgeStrip = document.createElement('div');
  liveBadgeStrip.className = 'watch-live-strip';
  liveBadgeStrip.innerHTML = `
    <span class="watch-live-dot"></span>
    <span>FIFA World Cup 2026 — Free Live Streams</span>
    <span class="watch-strip-note">Switch channels inside the player</span>
  `;
  view.appendChild(liveBadgeStrip);

  // ── Iframe wrapper ─────────────────────────────────────────────────────────
  const iframeWrapper = document.createElement('div');
  iframeWrapper.className = 'watch-iframe-wrapper';

  // Loading overlay
  const loadOverlay = document.createElement('div');
  loadOverlay.className = 'watch-load-overlay';
  loadOverlay.innerHTML = `
    <div class="watch-load-spinner">
      <div class="watch-spinner-ring"></div>
    </div>
    <div class="watch-load-text">
      <span class="watch-load-title">Loading Live Streams</span>
      <span class="watch-load-sub">Connecting to livekhela.tv…</span>
    </div>
  `;
  iframeWrapper.appendChild(loadOverlay);

  // Error overlay (shown if iframe fails)
  const errorOverlay = document.createElement('div');
  errorOverlay.className = 'watch-error-overlay';
  errorOverlay.style.display = 'none';
  errorOverlay.innerHTML = `
    <div class="watch-error-icon">📺</div>
    <div class="watch-error-title">Streaming Blocked in Browser</div>
    <div class="watch-error-sub">livekhela.tv restricts embedding in desktop browsers.<br><strong>On your Android device it will work correctly.</strong><br>Or tap below to watch in your browser.</div>
    <button class="watch-error-btn" id="watch-error-open-btn">Open livekhela.tv in Browser</button>
  `;
  iframeWrapper.appendChild(errorOverlay);

  // The iframe
  const iframe = document.createElement('iframe');
  iframe.className = 'watch-iframe';
  iframe.id = 'watch-iframe';
  iframe.src = WATCH_URL;
  iframe.allow = 'autoplay; fullscreen; encrypted-media; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('webkitallowfullscreen', '');
  iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
  iframe.style.opacity = '0';
  iframeWrapper.appendChild(iframe);

  view.appendChild(iframeWrapper);
  container.appendChild(view);

  // ── Event Handlers ─────────────────────────────────────────────────────────
  const openInBrowser = () => {
    // Capacitor: use window.open which is intercepted by Capacitor to open native browser
    window.open(WATCH_URL, '_system') || window.open(WATCH_URL, '_blank');
  };

  // Show iframe once loaded, hide overlay
  iframe.addEventListener('load', () => {
    iframe.style.opacity = '1';
    loadOverlay.style.opacity = '0';
    setTimeout(() => { loadOverlay.style.display = 'none'; }, 300);
  });

  // Detect load errors (best-effort — cross-origin errors are silent)
  iframe.addEventListener('error', () => {
    loadOverlay.style.display = 'none';
    errorOverlay.style.display = 'flex';
  });

  // If iframe takes >8s to show content, or is blocked, show error state
  const loadTimeout = setTimeout(() => {
    if (loadOverlay.style.display !== 'none') {
      loadOverlay.style.display = 'none';
      errorOverlay.style.display = 'flex';
    }
  }, 8000);

  // Detect CSP/X-Frame-Options blocking (fires immediately on block)
  document.addEventListener('securitypolicyviolation', () => {
    clearTimeout(loadTimeout);
    loadOverlay.style.display = 'none';
    errorOverlay.style.display = 'flex';
  }, { once: true });

  refreshBtn.addEventListener('click', () => {
    // Re-show loading overlay and reload
    loadOverlay.style.display = 'flex';
    loadOverlay.style.opacity = '1';
    errorOverlay.style.display = 'none';
    iframe.style.opacity = '0';
    iframe.src = WATCH_URL + '?r=' + Date.now(); // bust cache
  });

  openBtn.addEventListener('click', openInBrowser);

  const errorOpenBtn = errorOverlay.querySelector('#watch-error-open-btn');
  if (errorOpenBtn) errorOpenBtn.addEventListener('click', openInBrowser);

  return {
    destroy() {
      clearTimeout(loadTimeout);
    },
    update() {
      // Watch view has no data to update
    }
  };
}
