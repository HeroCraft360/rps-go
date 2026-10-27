export function roundHistory(records) {
  if(!records.length)return '<p>No completed rounds yet. Actual hands appear after reveal.</p>';
  return `<ol>${[...records].reverse().map(r=>`<li><b>ROUND ${r.round} · ${r.result==='tie'?'TIE':r.result==='player'?'WIN':'LOSS'}</b><span>YOU: ${r.player.toUpperCase()}${r.playerAutoPick?' · AUTO PICK':''}</span><span>BYTE: ${r.opponent.toUpperCase()}${r.opponentAutoPick?' · AUTO PICK':''}</span><small>YOUR CLAIM: ${r.playerClaim?.toUpperCase()||'NONE'} / BYTE CLAIM: ${r.opponentClaim?.toUpperCase()||'NONE'}</small></li>`).join('')}</ol><p>Claims are public bluffs, not proof of intent.</p>`;
}
