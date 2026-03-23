/**
 * Cartographer — Responsive UI Helpers
 *
 * Sidebar resize, timeline resize, minimap drag.
 */

class ResponsiveUI {
  constructor() {
    this._initSidebarResize();
    this._initTimelineResize();
    this._initMinimapDrag();
  }

  // ─── Sidebar resizable by drag ──────────────────────────────

  _initSidebarResize() {
    const handle = document.getElementById('sidebar-resize-handle');
    const sidebar = document.getElementById('sidebar');
    if (!handle || !sidebar) return;

    let startX, startW;

    const onMove = (e) => {
      const dx = startX - (e.clientX || e.touches[0].clientX);
      const newW = Math.min(480, Math.max(280, startW + dx));
      sidebar.style.width = newW + 'px';
      document.documentElement.style.setProperty('--sidebar-width', newW + 'px');
    };

    const onUp = () => {
      handle.classList.remove('active');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX;
      startW = sidebar.offsetWidth;
      handle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    handle.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startW = sidebar.offsetWidth;
      handle.classList.add('active');
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    });
  }

  // ─── Timeline resizable by drag ─────────────────────────────

  _initTimelineResize() {
    const handle = document.getElementById('timeline-resize-handle');
    const timeline = document.getElementById('timeline');
    if (!handle || !timeline) return;

    let startY, startH;

    const onMove = (e) => {
      const dy = startY - (e.clientY || e.touches[0].clientY);
      const newH = Math.min(400, Math.max(100, startH + dy));
      document.documentElement.style.setProperty('--timeline-height', newH + 'px');
      // Force re-render of timeline canvas
      const evt = new Event('resize');
      window.dispatchEvent(evt);
    };

    const onUp = () => {
      handle.classList.remove('active');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    handle.addEventListener('mousedown', (e) => {
      if (timeline.classList.contains('collapsed')) return;
      e.preventDefault();
      startY = e.clientY;
      startH = timeline.offsetHeight;
      handle.classList.add('active');
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    handle.addEventListener('touchstart', (e) => {
      if (timeline.classList.contains('collapsed')) return;
      startY = e.touches[0].clientY;
      startH = timeline.offsetHeight;
      handle.classList.add('active');
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    });
  }

  // ─── Minimap repositionable by drag ─────────────────────────

  _initMinimapDrag() {
    // Wait for minimap to be created
    const observer = new MutationObserver(() => {
      const minimap = document.querySelector('.minimap');
      if (minimap && !minimap._dragInit) {
        minimap._dragInit = true;
        this._setupMinimapDrag(minimap);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  _setupMinimapDrag(minimap) {
    // Add a drag handle
    const dragHandle = document.createElement('button');
    dragHandle.className = 'minimap-drag-handle';
    dragHandle.innerHTML = '&#9783;';
    dragHandle.title = 'Déplacer la minimap';
    minimap.appendChild(dragHandle);

    const container = document.getElementById('canvas-container');
    if (!container) return;

    let startX, startY, startLeft, startTop;

    const onMove = (e) => {
      const cx = e.clientX || e.touches[0].clientX;
      const cy = e.clientY || e.touches[0].clientY;
      const containerRect = container.getBoundingClientRect();
      let newLeft = startLeft + (cx - startX);
      let newTop = startTop + (cy - startY);
      // Clamp within container
      newLeft = Math.max(0, Math.min(containerRect.width - minimap.offsetWidth, newLeft));
      newTop = Math.max(0, Math.min(containerRect.height - minimap.offsetHeight, newTop));
      minimap.style.left = newLeft + 'px';
      minimap.style.top = newTop + 'px';
      minimap.style.right = 'auto';
      minimap.style.bottom = 'auto';
    };

    const onUp = () => {
      minimap.classList.remove('dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    const onDown = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const containerRect = container.getBoundingClientRect();
      const minimapRect = minimap.getBoundingClientRect();
      startX = e.clientX || e.touches[0].clientX;
      startY = e.clientY || e.touches[0].clientY;
      startLeft = minimapRect.left - containerRect.left;
      startTop = minimapRect.top - containerRect.top;
      // Convert from right/bottom positioning to left/top
      minimap.style.left = startLeft + 'px';
      minimap.style.top = startTop + 'px';
      minimap.style.right = 'auto';
      minimap.style.bottom = 'auto';
      minimap.classList.add('dragging');
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    dragHandle.addEventListener('mousedown', onDown);
    dragHandle.addEventListener('touchstart', (e) => {
      onDown({ preventDefault: () => {}, stopPropagation: () => {}, clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
    });
  }
}

export { ResponsiveUI };
