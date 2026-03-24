/**
 * Cartographer — City & Civilization Symbols
 * Style: 17th-century engraving, stroke-only, viewBox 24×24
 */

const CITY_SYMBOLS = [
  { id: 'capital', name: 'Capitale', category: 'Villes',
    svg: '<circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M12,2 L13.8,8.2 L20.4,7.6 L15.6,12 L18,18.4 L12,14.8 L6,18.4 L8.4,12 L3.6,7.6 L10.2,8.2Z" fill="none" stroke="currentColor" stroke-width="1"/><line x1="12" y1="1" x2="12" y2="4" stroke="currentColor" stroke-width="0.8"/><line x1="23" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="0.8"/><line x1="12" y1="23" x2="12" y2="20" stroke="currentColor" stroke-width="0.8"/><line x1="1" y1="12" x2="4" y2="12" stroke="currentColor" stroke-width="0.8"/><line x1="4.2" y1="4.2" x2="6.4" y2="6.4" stroke="currentColor" stroke-width="0.6"/><line x1="19.8" y1="4.2" x2="17.6" y2="6.4" stroke="currentColor" stroke-width="0.6"/><line x1="19.8" y1="19.8" x2="17.6" y2="17.6" stroke="currentColor" stroke-width="0.6"/><line x1="4.2" y1="19.8" x2="6.4" y2="17.6" stroke="currentColor" stroke-width="0.6"/>' },
  { id: 'city', name: 'Ville', category: 'Villes',
    svg: '<circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="1.3"/><line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" stroke-width="1"/><line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" stroke-width="1"/><circle cx="12" cy="6" r="1" fill="currentColor"/><circle cx="12" cy="18" r="1" fill="currentColor"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="18" cy="12" r="1" fill="currentColor"/>' },
  { id: 'village', name: 'Village', category: 'Villes',
    svg: '<circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>' },
  { id: 'port', name: 'Port', category: 'Villes',
    svg: '<path d="M12,3 L12,13" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12,3 Q18,5 18,9 L12,8" fill="none" stroke="currentColor" stroke-width="1"/><path d="M6,15 Q6,19 12,20 Q18,19 18,15" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4,15 L20,15" stroke="currentColor" stroke-width="1"/><path d="M9,15 Q9,13 12,13 Q15,13 15,15" fill="none" stroke="currentColor" stroke-width="0.8"/><circle cx="10" cy="21" r="0.6" fill="currentColor"/><circle cx="14" cy="21" r="0.6" fill="currentColor"/>' },
  { id: 'fortress', name: 'Forteresse', category: 'Villes',
    svg: '<rect x="5" y="8" width="14" height="12" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="3" y="6" width="4" height="4" fill="none" stroke="currentColor" stroke-width="1"/><rect x="17" y="6" width="4" height="4" fill="none" stroke="currentColor" stroke-width="1"/><rect x="10" y="6" width="4" height="4" fill="none" stroke="currentColor" stroke-width="1"/><path d="M3,6 L3,4 M5,6 L5,4 M7,6 L7,4" stroke="currentColor" stroke-width="0.8"/><path d="M17,6 L17,4 M19,6 L19,4 M21,6 L21,4" stroke="currentColor" stroke-width="0.8"/><path d="M10,6 L10,4.5 M12,6 L12,4.5 M14,6 L14,4.5" stroke="currentColor" stroke-width="0.8"/><rect x="10" y="14" width="4" height="6" fill="none" stroke="currentColor" stroke-width="0.8"/>' },
  { id: 'temple', name: 'Temple', category: 'Villes',
    svg: '<path d="M12,3 L4,9 L20,9 Z" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="6" y1="9" x2="6" y2="18" stroke="currentColor" stroke-width="1.2"/><line x1="10" y1="9" x2="10" y2="18" stroke="currentColor" stroke-width="1.2"/><line x1="14" y1="9" x2="14" y2="18" stroke="currentColor" stroke-width="1.2"/><line x1="18" y1="9" x2="18" y2="18" stroke="currentColor" stroke-width="1.2"/><path d="M3,18 L21,18" stroke="currentColor" stroke-width="1.3"/><path d="M2,20 L22,20" stroke="currentColor" stroke-width="1.5"/>' },
  { id: 'ruins', name: 'Ruines', category: 'Villes',
    svg: '<path d="M4,20 L4,12 Q8,8 12,12" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12,12 L12,16" stroke="currentColor" stroke-width="1.2" stroke-dasharray="2,1.5"/><path d="M16,20 L16,15" stroke="currentColor" stroke-width="1.2"/><path d="M19,20 L19,17" stroke="currentColor" stroke-width="1"/><rect x="6" y="18" width="3" height="2" fill="none" stroke="currentColor" stroke-width="0.8" transform="rotate(-12,7.5,19)"/><rect x="13" y="19" width="2.5" height="1.5" fill="none" stroke="currentColor" stroke-width="0.8" transform="rotate(8,14,19.5)"/><circle cx="10" cy="20" r="1" fill="none" stroke="currentColor" stroke-width="0.7"/>' },
  { id: 'mine', name: 'Mine', category: 'Villes',
    svg: '<path d="M6,20 Q6,14 12,11 Q18,14 18,20" fill="none" stroke="currentColor" stroke-width="1.3"/><line x1="8" y1="13" x2="8" y2="20" stroke="currentColor" stroke-width="1.2"/><line x1="16" y1="13" x2="16" y2="20" stroke="currentColor" stroke-width="1.2"/><line x1="8" y1="16" x2="16" y2="16" stroke="currentColor" stroke-width="0.8"/><path d="M10,10 L7,5" stroke="currentColor" stroke-width="1"/><path d="M14,10 L17,5" stroke="currentColor" stroke-width="1"/>' },
  { id: 'lighthouse', name: 'Phare', category: 'Villes',
    svg: '<path d="M10,22 L10,10 L12,4 L14,10 L14,22" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="9" y1="14" x2="15" y2="14" stroke="currentColor" stroke-width="1"/><line x1="9" y1="18" x2="15" y2="18" stroke="currentColor" stroke-width="1"/><circle cx="12" cy="6" r="1.5" fill="none" stroke="currentColor" stroke-width="0.8"/><line x1="6" y1="5" x2="9" y2="6" stroke="currentColor" stroke-width="0.7"/><line x1="18" y1="5" x2="15" y2="6" stroke="currentColor" stroke-width="0.7"/><line x1="5" y1="8" x2="9" y2="8" stroke="currentColor" stroke-width="0.7"/><line x1="19" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="0.7"/><line x1="7" y1="2" x2="10" y2="5" stroke="currentColor" stroke-width="0.7"/>' },
  { id: 'bridge', name: 'Pont', category: 'Villes',
    svg: '<path d="M1,14 Q7,6 12,14 Q17,6 23,14" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="7" y1="10" x2="7" y2="20" stroke="currentColor" stroke-width="1.2"/><line x1="17" y1="10" x2="17" y2="20" stroke="currentColor" stroke-width="1.2"/><path d="M1,16 Q7,10 12,16 Q17,10 23,16" fill="none" stroke="currentColor" stroke-width="0.6" stroke-opacity="0.4"/>' },
  { id: 'inn', name: 'Auberge', category: 'Villes',
    svg: '<path d="M4,20 L4,10 L12,4 L20,10 L20,20 Z" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="9" y="13" width="6" height="7" fill="none" stroke="currentColor" stroke-width="1"/><line x1="12" y1="13" x2="12" y2="20" stroke="currentColor" stroke-width="0.8"/><line x1="20" y1="12" x2="23" y2="12" stroke="currentColor" stroke-width="1"/><line x1="23" y1="10" x2="23" y2="14" stroke="currentColor" stroke-width="0.8"/><circle cx="23" cy="12" r="0.6" fill="currentColor"/>' },
  { id: 'market', name: 'Marché', category: 'Villes',
    svg: '<path d="M2,12 L6,6 L10,12" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M8,12 L12,6 L16,12" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M14,12 L18,6 L22,12" fill="none" stroke="currentColor" stroke-width="1.1"/><line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="12" x2="4" y2="20" stroke="currentColor" stroke-width="1"/><line x1="12" y1="12" x2="12" y2="20" stroke="currentColor" stroke-width="1"/><line x1="20" y1="12" x2="20" y2="20" stroke="currentColor" stroke-width="1"/><line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" stroke-width="1.2"/>' },
];

function drawCitySymbol(ctx, x, y, size, color, id) {
  const s = size / 24;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  if (id === 'capital') {
    ctx.beginPath(); ctx.arc(12, 12, 5, 0, Math.PI * 2); ctx.stroke();
    const pts = 8, or = 11, ir = 7;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const a = (i * Math.PI) / pts - Math.PI / 2;
      const r = i % 2 === 0 ? or : ir;
      i === 0 ? ctx.moveTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r) : ctx.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r);
    }
    ctx.closePath(); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.beginPath(); ctx.moveTo(12 + Math.cos(a) * 5, 12 + Math.sin(a) * 5);
      ctx.lineTo(12 + Math.cos(a) * 2, 12 + Math.sin(a) * 2); ctx.stroke();
    }
  } else if (id === 'city') {
    ctx.beginPath(); ctx.arc(12, 12, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 6); ctx.lineTo(12, 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 12); ctx.lineTo(18, 12); ctx.stroke();
    for (const [cx, cy] of [[12,6],[12,18],[6,12],[18,12]]) {
      ctx.beginPath(); ctx.arc(cx, cy, 1, 0, Math.PI * 2); ctx.fill();
    }
  } else if (id === 'village') {
    ctx.beginPath(); ctx.arc(12, 12, 5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, 12, 1.5, 0, Math.PI * 2); ctx.fill();
  } else {
    // Fallback: small circle
    ctx.beginPath(); ctx.arc(12, 12, 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

export { CITY_SYMBOLS, drawCitySymbol };
