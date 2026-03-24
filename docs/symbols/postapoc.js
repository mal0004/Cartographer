/**
 * Cartographer — Post-Apocalyptic Symbols
 * Style: 17th-century engraving, stroke-only, viewBox 24×24
 */

const POSTAPOC_SYMBOLS = [
  { id: 'radiation', name: 'Radiation', category: 'Post-Apo',
    svg: '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M12,9 Q10,5 7,4 Q5,7 6,10" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M14.6,13.5 Q17,14 19,12 Q18,9 15,8.5" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M9.4,13.5 Q7,14 5,17 Q7,19 10,18" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="0.8"/>' },
  { id: 'bunker', name: 'Bunker', category: 'Post-Apo',
    svg: '<rect x="4" y="12" width="16" height="8" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M4,12 L4,10 L20,10 L20,12" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M2,20 L22,20" stroke="currentColor" stroke-width="1.5"/><rect x="10" y="8" width="4" height="4" fill="none" stroke="currentColor" stroke-width="1"/><line x1="12" y1="8" x2="12" y2="6" stroke="currentColor" stroke-width="1"/><path d="M10,6 L14,6" stroke="currentColor" stroke-width="0.8"/><line x1="12" y1="14" x2="12" y2="18" stroke="currentColor" stroke-width="0.8"/><line x1="10" y1="16" x2="14" y2="16" stroke="currentColor" stroke-width="0.8"/>' },
  { id: 'antenna', name: 'Antenne', category: 'Post-Apo',
    svg: '<line x1="12" y1="22" x2="12" y2="6" stroke="currentColor" stroke-width="1.5"/><line x1="8" y1="22" x2="12" y2="14" stroke="currentColor" stroke-width="1"/><line x1="16" y1="22" x2="12" y2="14" stroke="currentColor" stroke-width="1"/><path d="M7,8 Q9,5 12,5" fill="none" stroke="currentColor" stroke-width="0.9"/><path d="M17,8 Q15,5 12,5" fill="none" stroke="currentColor" stroke-width="0.9"/><path d="M5,10 Q8,6 12,6" fill="none" stroke="currentColor" stroke-width="0.7"/><path d="M19,10 Q16,6 12,6" fill="none" stroke="currentColor" stroke-width="0.7"/><path d="M3,12 Q7,7 12,7" fill="none" stroke="currentColor" stroke-width="0.5"/><path d="M21,12 Q17,7 12,7" fill="none" stroke="currentColor" stroke-width="0.5"/><circle cx="12" cy="4" r="1.5" fill="none" stroke="currentColor" stroke-width="0.8"/>' },
];

function drawPostapocSymbol(ctx, x, y, size, color, id) {
  const s = size / 24;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  if (id === 'radiation') {
    ctx.beginPath(); ctx.arc(12, 12, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, 12, 9, 0, Math.PI * 2); ctx.lineWidth = 0.8; ctx.stroke();
    const angles = [(-Math.PI / 2), (Math.PI / 6), (5 * Math.PI / 6)];
    ctx.lineWidth = 1.3;
    for (const a of angles) {
      ctx.beginPath();
      ctx.arc(12, 12, 3, a - 0.3, a + 0.3);
      const mx = 12 + Math.cos(a) * 7, my = 12 + Math.sin(a) * 7;
      ctx.lineTo(mx + Math.cos(a + 0.5) * 2, my + Math.sin(a + 0.5) * 2);
      ctx.arc(12, 12, 9, a + 0.5, a - 0.5, true);
      ctx.closePath(); ctx.stroke();
    }
  } else if (id === 'bunker') {
    ctx.strokeRect(4, 12, 16, 8);
    ctx.beginPath(); ctx.moveTo(4, 12); ctx.lineTo(4, 10);
    ctx.lineTo(20, 10); ctx.lineTo(20, 12); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(2, 20); ctx.lineTo(22, 20); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 8, 4, 4);
  } else if (id === 'antenna') {
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(12, 22); ctx.lineTo(12, 6); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(8, 22); ctx.lineTo(12, 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, 22); ctx.lineTo(12, 14); ctx.stroke();
    ctx.beginPath(); ctx.arc(12, 4, 1.5, 0, Math.PI * 2); ctx.stroke();
    for (const [r, w] of [[3, 0.9], [5, 0.7], [7, 0.5]]) {
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.arc(12, 5, r, -Math.PI * 0.8, -Math.PI * 0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(12, 5, r, -Math.PI * 0.8 + Math.PI, -Math.PI * 0.2 + Math.PI); ctx.stroke();
    }
  }
  ctx.restore();
}

export { POSTAPOC_SYMBOLS, drawPostapocSymbol };
