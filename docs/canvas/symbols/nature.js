/**
 * Cartographer — Nature & Terrain Symbols
 * Style: 17th-century engraving, stroke-only, viewBox 24×24
 */

const NATURE_SYMBOLS = [
  { id: 'mountain', name: 'Montagne', category: 'Nature',
    svg: '<path d="M2,20 L8,6 L11,12 L14,7 L22,20 Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6,14 L8,11 L10,14" fill="none" stroke="currentColor" stroke-width="0.7"/><path d="M14,13 L16,10 L18,14" fill="none" stroke="currentColor" stroke-width="0.7"/><path d="M10,17 L12,14 L14,17" fill="none" stroke="currentColor" stroke-width="0.7"/>' },
  { id: 'volcano', name: 'Volcan', category: 'Nature',
    svg: '<path d="M3,22 L9,8 L12,12 L15,8 L21,22 Z" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M10,6 Q11,2 12,2 Q13,2 14,6" fill="none" stroke="currentColor" stroke-width="1"/><path d="M9,5 Q9.5,1 10.5,1.5" fill="none" stroke="currentColor" stroke-width="0.8"/><path d="M15,5 Q14.5,1.5 13.5,1" fill="none" stroke="currentColor" stroke-width="0.8"/>' },
  { id: 'tree', name: 'Arbre', category: 'Nature',
    svg: '<path d="M12,20 Q11,16 12,12" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M6,12 Q6,5 12,3 Q18,5 18,12 Q15,13 12,12 Q9,13 6,12 Z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M9,10 Q10,7 12,6" fill="none" stroke="currentColor" stroke-width="0.6"/><path d="M15,10 Q14,7 12,6" fill="none" stroke="currentColor" stroke-width="0.6"/>' },
  { id: 'conifer', name: 'Conifère', category: 'Nature',
    svg: '<line x1="12" y1="22" x2="12" y2="8" stroke="currentColor" stroke-width="1.3"/><path d="M12,3 L7,10 L9,10 L5,15 L8,15 L4,20 L20,20 L16,15 L19,15 L15,10 L17,10 Z" fill="none" stroke="currentColor" stroke-width="1.1"/>' },
  { id: 'swamp', name: 'Marais', category: 'Nature',
    svg: '<line x1="6" y1="10" x2="6" y2="16" stroke="currentColor" stroke-width="1.3"/><path d="M5,10 L6,8 L7,10" fill="none" stroke="currentColor" stroke-width="0.8"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="1.3"/><path d="M11,8 L12,5 L13,8" fill="none" stroke="currentColor" stroke-width="0.8"/><line x1="18" y1="10" x2="18" y2="16" stroke="currentColor" stroke-width="1.3"/><path d="M17,10 L18,7 L19,10" fill="none" stroke="currentColor" stroke-width="0.8"/><path d="M2,17 Q6,15 12,17 Q18,15 22,17" fill="none" stroke="currentColor" stroke-width="1"/><path d="M2,20 Q6,18 12,20 Q18,18 22,20" fill="none" stroke="currentColor" stroke-width="1"/>' },
  { id: 'desert', name: 'Désert', category: 'Nature',
    svg: '<path d="M1,18 Q6,12 12,16 Q18,12 23,18" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M4,15 Q7,11 10,14" fill="none" stroke="currentColor" stroke-width="0.9"/><circle cx="7" cy="7" r="0.8" fill="currentColor"/><circle cx="14" cy="9" r="0.7" fill="currentColor"/><circle cx="10" cy="11" r="0.6" fill="currentColor"/><circle cx="17" cy="7" r="0.5" fill="currentColor"/><circle cx="19" cy="11" r="0.6" fill="currentColor"/>' },
  { id: 'cave', name: 'Grotte', category: 'Nature',
    svg: '<path d="M4,20 Q4,10 12,6 Q20,10 20,20" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8,13 L8,15" stroke="currentColor" stroke-width="1"/><path d="M11,11 L11,14" stroke="currentColor" stroke-width="1"/><path d="M14,12 L14,14.5" stroke="currentColor" stroke-width="1"/><path d="M8,20 Q8,16 12,14 Q16,16 16,20" fill="none" stroke="currentColor" stroke-width="0.9" stroke-opacity="0.5"/>' },
  { id: 'waterfall', name: 'Cascade', category: 'Nature',
    svg: '<path d="M6,4 Q6,2 8,2 L16,2 Q18,2 18,4" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8,4 L8,14" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/><path d="M12,4 L12,14" stroke="currentColor" stroke-width="1.2" stroke-dasharray="3,2"/><path d="M16,4 L16,14" stroke="currentColor" stroke-width="1" stroke-dasharray="2,2"/><path d="M4,16 Q8,13 12,16 Q16,13 20,16" fill="none" stroke="currentColor" stroke-width="1"/><path d="M5,19 Q9,16 12,19 Q15,16 19,19" fill="none" stroke="currentColor" stroke-width="0.8"/>' },
  { id: 'reef', name: 'Récif', category: 'Nature',
    svg: '<path d="M2,14 L5,10 L8,14 L11,9 L14,14 L17,10 L20,14 L22,11" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8,14 L7,17 M14,14 L13,17 M11,9 L10,12" fill="none" stroke="currentColor" stroke-width="0.8"/><line x1="4" y1="18" x2="8" y2="18" stroke="currentColor" stroke-width="0.6"/><line x1="14" y1="19" x2="18" y2="19" stroke="currentColor" stroke-width="0.6"/>' },
];

function drawNatureSymbol(ctx, x, y, size, color, id) {
  const s = size / 24;
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.2;
  ctx.lineCap = 'round';
  if (id === 'mountain') {
    ctx.beginPath(); ctx.moveTo(2, 20); ctx.lineTo(8, 6); ctx.lineTo(11, 12);
    ctx.lineTo(14, 7); ctx.lineTo(22, 20); ctx.closePath(); ctx.stroke();
    for (const [x1, y1, x2, y2, x3, y3] of [[6,14,8,11,10,14],[14,13,16,10,18,14],[10,17,12,14,14,17]]) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.stroke();
    }
  } else if (id === 'volcano') {
    ctx.beginPath(); ctx.moveTo(3, 22); ctx.lineTo(9, 8); ctx.lineTo(12, 12);
    ctx.lineTo(15, 8); ctx.lineTo(21, 22); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 6); ctx.quadraticCurveTo(11, 2, 12, 2);
    ctx.quadraticCurveTo(13, 2, 14, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(9, 5); ctx.quadraticCurveTo(9.5, 1, 10.5, 1.5); ctx.stroke();
  } else if (id === 'tree') {
    ctx.beginPath(); ctx.moveTo(12, 20); ctx.quadraticCurveTo(11, 16, 12, 12); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(6, 12); ctx.quadraticCurveTo(6, 5, 12, 3);
    ctx.quadraticCurveTo(18, 5, 18, 12); ctx.quadraticCurveTo(15, 13, 12, 12);
    ctx.quadraticCurveTo(9, 13, 6, 12); ctx.closePath(); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(12, 12, 5, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

export { NATURE_SYMBOLS, drawNatureSymbol };
