/* sidebar.js — Side panel with info form, markdown editor, relations & events tabs */
'use strict';

(function () {
  const sidebar      = document.getElementById('sidebar');
  const sidebarTitle = document.getElementById('sidebar-title');
  const tabBtns      = document.querySelectorAll('.tab-btn');
  const tabPanels    = document.querySelectorAll('.tab-panel');
  const infoForm     = document.getElementById('info-form');
  const mdInput      = document.getElementById('md-input');
  const mdPreview    = document.getElementById('md-preview');
  const relationsList= document.getElementById('relations-list');
  const eventsList   = document.getElementById('entity-events-list');
  const btnSave      = document.getElementById('btn-save-element');
  const btnDel       = document.getElementById('btn-delete-element');
  const btnClose     = document.getElementById('sidebar-close');

  let currentEl = null;

  /* ── Tabs ─────────────────────────────────────────────────────────────── */
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`)?.classList.add('active');
    });
  });

  /* ── Open / Close ─────────────────────────────────────────────────────── */
  function open(el) {
    currentEl = el;
    sidebar.classList.remove('sidebar-closed');
    sidebar.classList.add('sidebar-open');
    renderInfoForm(el);
    updateRelations(el);
    updateEntityEvents(el);
    // Reset to info tab
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === 'info'));
    tabPanels.forEach(p => p.classList.toggle('active', p.id === 'tab-info'));
  }

  function close() {
    sidebar.classList.remove('sidebar-open');
    sidebar.classList.add('sidebar-closed');
    currentEl = null;
  }

  btnClose.addEventListener('click', close);

  /* ── Info form per element type ───────────────────────────────────────── */
  function renderInfoForm(el) {
    const d = el.data;
    sidebarTitle.textContent = typeLabel(el.type);
    infoForm.innerHTML = '';

    const fields = infoFields(el.type);
    for (const f of fields) {
      const label = document.createElement('label');
      label.textContent = f.label;

      let input;
      if (f.type === 'select') {
        input = document.createElement('select');
        for (const opt of f.options) {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          if ((d[f.key] || f.default) === opt.value) o.selected = true;
          input.appendChild(o);
        }
      } else if (f.type === 'tags') {
        input = buildTagsInput(d[f.key] || []);
        input.dataset.key = f.key;
        label.appendChild(input);
        infoForm.appendChild(label);
        continue;
      } else {
        input = document.createElement('input');
        input.type  = f.type || 'text';
        input.value = d[f.key] ?? f.default ?? '';
      }
      input.dataset.key = f.key;
      label.appendChild(input);
      infoForm.appendChild(label);
    }

    // Markdown description
    mdInput.value = d.description || '';
    renderMarkdown(mdInput.value);
  }

  function infoFields(type) {
    switch (type) {
      case 'city':
        return [
          { key: 'name',       label: 'Name',       type: 'text' },
          { key: 'importance', label: 'Type',        type: 'select',
            options: [{value:'village',label:'Village'},{value:'city',label:'City'},{value:'capital',label:'Capital'}],
            default: 'city' },
          { key: 'population', label: 'Population',  type: 'text' },
          { key: 'founded',    label: 'Founded (year)', type: 'text' },
        ];
      case 'territory':
        return [
          { key: 'name',     label: 'Name',     type: 'text' },
          { key: 'ruler',    label: 'Ruler',    type: 'text' },
          { key: 'capital',  label: 'Capital',  type: 'text' },
          { key: 'resources',label: 'Resources',type: 'tags' },
          { key: 'color',    label: 'Color',    type: 'color', default: '#8B2635' },
        ];
      case 'route':
        return [
          { key: 'name',   label: 'Name',             type: 'text' },
          { key: 'style',  label: 'Style',            type: 'select',
            options: [{value:'track',label:'Track'},{value:'road',label:'Road'},{value:'royal',label:'Royal Road'}],
            default: 'road' },
          { key: 'length', label: 'Est. Length',      type: 'text' },
        ];
      case 'region':
        return [
          { key: 'name',    label: 'Name',    type: 'text' },
          { key: 'subtype', label: 'Terrain', type: 'select',
            options: [{value:'forest',label:'Forest'},{value:'mountain',label:'Mountain'},{value:'desert',label:'Desert'},{value:'ocean',label:'Ocean'}],
            default: 'forest' },
        ];
      case 'text':
        return [
          { key: 'text',     label: 'Text',      type: 'text' },
          { key: 'fontSize', label: 'Size',       type: 'number' },
        ];
      default:
        return [{ key: 'name', label: 'Name', type: 'text' }];
    }
  }

  function typeLabel(type) {
    return { territory:'Territory', city:'City', route:'Route', region:'Region', text:'Label' }[type] || 'Element';
  }

  /* ── Tags input ───────────────────────────────────────────────────────── */
  function buildTagsInput(initialTags) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tags-container';
    let tags = Array.isArray(initialTags) ? [...initialTags] : [];

    function renderTags() {
      wrapper.innerHTML = '';
      for (const tag of tags) {
        const chip = document.createElement('span');
        chip.className = 'tag-chip';
        chip.textContent = tag;
        const rm = document.createElement('button');
        rm.textContent = '×';
        rm.addEventListener('click', () => {
          tags = tags.filter(t => t !== tag);
          renderTags();
        });
        chip.appendChild(rm);
        wrapper.appendChild(chip);
      }
      const inp = document.createElement('input');
      inp.className = 'tags-input';
      inp.placeholder = 'Add tag…';
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const val = inp.value.trim().replace(',', '');
          if (val && !tags.includes(val)) tags.push(val);
          renderTags();
        }
        if (e.key === 'Backspace' && !inp.value && tags.length) {
          tags.pop();
          renderTags();
        }
      });
      wrapper.appendChild(inp);
      // Store tags array on wrapper for reading back
      wrapper._tags = tags;
    }
    renderTags();
    return wrapper;
  }

  /* ── Markdown editor ──────────────────────────────────────────────────── */
  mdInput.addEventListener('input', () => renderMarkdown(mdInput.value));

  document.querySelectorAll('.md-toolbar button').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.md;
      const start = mdInput.selectionStart;
      const end   = mdInput.selectionEnd;
      const sel   = mdInput.value.slice(start, end);
      let  rep    = sel;
      if (cmd === 'bold')   rep = `**${sel}**`;
      if (cmd === 'italic') rep = `*${sel}*`;
      if (cmd === 'h2')     rep = `## ${sel}`;
      if (cmd === 'ul')     rep = `\n- ${sel}`;
      mdInput.setRangeText(rep, start, end, 'select');
      renderMarkdown(mdInput.value);
    });
  });

  function renderMarkdown(text) {
    mdPreview.innerHTML = parseMarkdown(text);
  }

  function parseMarkdown(text) {
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^## (.+)$/gm,   '<h2>$1</h2>')
      .replace(/^### (.+)$/gm,  '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/^- (.+)$/gm,    '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      .replace(/\n\n+/g, '</p><p>')
      .replace(/^(?!<[hul])(.+)$/gm, (m) => m ? m : '')
      .trim()
      .replace(/^([^<].*)$/gm, '<p>$1</p>');
  }

  /* ── Relations tab ────────────────────────────────────────────────────── */
  function updateRelations(el) {
    const text = el.data.description || '';
    const allEls = window.CanvasModule?.getElements() || [];
    const mentioned = allEls.filter(e => {
      if (e.id === el.id) return false;
      const name = e.data.name || e.data.text || '';
      return name && text.toLowerCase().includes(name.toLowerCase());
    });
    relationsList.innerHTML = '';
    for (const ref of mentioned) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="el-icon">${typeIcon(ref.type)}</span>${escHTML(ref.data.name || ref.data.text || '(unnamed)')}`;
      li.addEventListener('click', () => {
        window.CanvasModule?.centerOn(ref);
        open(ref);
      });
      relationsList.appendChild(li);
    }
    if (!mentioned.length) {
      const li = document.createElement('li');
      li.style.opacity = '0.5';
      li.style.cursor  = 'default';
      li.textContent   = 'No linked entities found.';
      relationsList.appendChild(li);
    }
  }

  /* ── Events tab ────────────────────────────────────────────────────────── */
  function updateEntityEvents(el) {
    const allEvents = window.TimelineModule?.getEvents() || [];
    const linked = allEvents.filter(ev => ev.entity_ids?.includes(el.id));
    eventsList.innerHTML = '';
    for (const ev of linked) {
      const li = document.createElement('li');
      li.textContent = `An ${ev.date_value} — ${ev.title}`;
      li.addEventListener('click', () => window.TimelineModule?.focusEvent(ev));
      eventsList.appendChild(li);
    }
    if (!linked.length) {
      const li = document.createElement('li');
      li.style.opacity = '0.5';
      li.style.cursor  = 'default';
      li.textContent   = 'No linked timeline events.';
      eventsList.appendChild(li);
    }
  }

  /* ── Save ─────────────────────────────────────────────────────────────── */
  btnSave.addEventListener('click', async () => {
    if (!currentEl) return;
    const d = { ...currentEl.data };
    d.description = mdInput.value;

    // Collect form fields
    infoForm.querySelectorAll('[data-key]').forEach(inp => {
      const key = inp.dataset.key;
      if (inp.classList.contains('tags-container')) {
        d[key] = inp._tags || [];
      } else if (inp.type === 'number') {
        d[key] = Number(inp.value);
      } else {
        d[key] = inp.value;
      }
    });

    const updated = await window.CanvasModule?.updateElement(currentEl.id, d);
    if (updated) {
      currentEl = updated;
      updateRelations(updated);
    }
  });

  /* ── Delete ───────────────────────────────────────────────────────────── */
  btnDel.addEventListener('click', () => {
    if (!currentEl) return;
    if (!confirm('Delete this element?')) return;
    window.CanvasModule?.deleteSelected();
    close();
  });

  /* ── Helpers ──────────────────────────────────────────────────────────── */
  function typeIcon(type) {
    return { territory:'⬡', city:'⬤', route:'↝', region:'⊕', text:'𝐓' }[type] || '●';
  }
  function escHTML(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ── Public API ────────────────────────────────────────────────────────── */
  window.SidebarModule = { open, close, updateEntityEvents };
})();
