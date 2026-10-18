import { Match } from './core/match.js';
import { loadSave, persistSave, defaultSave } from './core/storage.js';
import { purchase, equip, rewardMatch } from './core/economy.js';
import { SKINS, CONFIG, MOVES } from './config.js';
import { paintIcon } from './render/pixel-art.js';
import { Arena } from './render/arena.js';
import { Sound } from './ui/sound.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let save = loadSave(storage), match = null, modalType = null, lastPhase = '', lastBeat = -1, lastRender = '';
const modal = $('#modal'), sound = new Sound(), arena = new Arena($('#arena')), homeArena = new Arena($('#home-canvas'));
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => save.settings.reducedMotion ?? motionPreference.matches;
function persist() { $('#save-warning').hidden = persistSave(storage,save); syncSave(); }
function syncSave() {
  $('#balance').textContent = save.coins.toLocaleString();
  $('.wallet').setAttribute('aria-label',`${save.coins} GO Coins. Open shop information`);
  $('#skin-label').textContent = SKINS.find(s => s.id === save.equippedSkinId).name.toUpperCase();
  sound.enabled = save.settings.sound;
  document.documentElement.classList.toggle('reduced',reduced());
  document.documentElement.classList.toggle('motion-enabled',!reduced());
  document.querySelectorAll('[data-icon]').forEach(c => paintIcon(c,c.dataset.icon,c.dataset.skin || save.equippedSkinId));
}
motionPreference.addEventListener('change',syncSave);
function openModal(type,html) {
  modalType = type; $('#modal-body').innerHTML = html;
  $('#close-modal').hidden = ['tutorial','result'].includes(type);
  if (!modal.open) modal.showModal();
  syncSave();
  (modal.querySelector('[autofocus]') || (type === 'tutorial' ? modal.querySelector('[data-action="begin"]') : $('#close-modal')))?.focus();
}
function closeModal() {
  if (modalType === 'tutorial') { begin(); return; }
  if (modalType === 'result') return;
  if (modalType === 'bluff') match?.cancelBluff();
  modal.close(); modalType = null;
}
function forceClose() { modal.close(); modalType = null; }
$('#close-modal').addEventListener('click',closeModal);
modal.addEventListener('cancel',e => { e.preventDefault();closeModal(); });
const heading = (label,title,subtitle='') => `<div class="modal-eyebrow">${label}</div><h2 id="modal-title">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}`;
function help(first = false) {
  openModal(first ? 'tutorial' : 'help',heading('WELCOME TO THE ARENA','THREE MOVES.<br>ONE MIND GAME.','Outsmart BYTE. First to 3 round wins takes the match.')+
    `<div class="help-steps"><article><b>01 / CHOOSE</b><p>Pick rock, scissors or paper. You have 10 seconds. Keys 1, 2, 3 work too.</p></article><article><b>02 / BLUFF</b><p>Optional: use Sike Out! to send a fake tell. Two per match. Your real hand stays secret.</p></article><article><b>03 / SHOOT</b><p>Lock your move with SHOOT, Enter or Space. Both hands reveal after the clock hits zero.</p></article></div><div class="help-rule">Rock beats scissors · Scissors beats paper · Paper beats rock</div><p class="live-note">No selection at zero? You get an AUTO PICK. Ties mean another round.</p><div class="modal-actions"><button class="pixel modal-primary" data-action="${first?'begin':'close'}">${first?"LET’S GO!":"GOT IT"}</button></div>`);
}
function start() {
  forceClose(); match?.stop(); match = new Match(); lastPhase = ''; lastBeat = -1; lastRender = '';
  $('#home').hidden = true; $('#game').hidden = false; $('#perk').hidden = false; $('.tiny-brand').hidden = true;
  if (!save.tutorialSeen) help(true); else match.start();
  render();
}
function begin() { save.tutorialSeen = true; persist(); forceClose(); match?.start(); }
function home() { forceClose(); match?.stop(); match = null; $('#home').hidden = false;$('#game').hidden=true;$('#perk').hidden=true;$('.tiny-brand').hidden=false; }
function shop(message = '') {
  openModal('shop',heading('COSMETICS ONLY','THE HAND SHOP',`Your style. Your showdown. <strong>${save.coins.toLocaleString()} GO Coins</strong>`)+
    `<div class="card-grid">${SKINS.map(s => {
      const owned = save.ownedSkinIds.includes(s.id), equipped = save.equippedSkinId === s.id, afford = save.coins >= s.price;
      return `<article class="shop-card"><canvas width="70" height="88" data-icon="scissors" data-skin="${s.id}" aria-label="${s.name} hand preview" role="img"></canvas><h3>${s.name}</h3><p>${s.description}</p><div class="price">${owned ? 'OWNED' : `${s.price} GO COINS`}</div><button class="pixel" data-${owned?'equip':'buy'}="${s.id}" ${equipped || !owned && !afford?'disabled':''}>${equipped?'EQUIPPED':owned?'EQUIP':afford?'UNLOCK':`NEED ${s.price-save.coins} MORE`}</button></article>`;
    }).join('')}</div><p class="shop-message" role="status">${message || 'Earn 120 coins for a win. 50 for a loss. Play to unlock.'}</p>${match && match.phase !== 'MATCH_RESULT' ? '<p class="live-note">Your round timer continues while browsing.</p>' : ''}`);
}
function settings() {
  openModal('settings',heading('MAKE IT YOURS','SETTINGS')+`<label class="setting-row"><span>Arcade sound<small>Original synthesized sound effects</small></span><input id="sound-toggle" type="checkbox" ${save.settings.sound?'checked':''}></label><label class="setting-row"><span>Reduced motion<small>Gentler reveals and no hand shaking</small></span><input id="motion-toggle" type="checkbox" ${reduced()?'checked':''}></label><p>Controls: 1 Rock · 2 Scissors · 3 Paper<br>Enter / Space: SHOOT · Escape: close a panel</p><div class="modal-actions"><button class="pixel" data-action="help">HOW TO PLAY</button><button class="danger" data-action="reset">RESET LOCAL SAVE</button></div>${match ? '<p class="live-note">The round timer keeps running in panels.</p>' : ''}`);
}
function bluff() {
  if (!match?.openBluff()) return;
  openModal('bluff',heading('SIKE OUT! / MAKE THEM SECOND-GUESS','SELECT A HAND','Send a fake tell. Your real move stays secret.')+`<div class="modal-clock"><span id="bluff-clock">${match.remaining}</span><small>SECONDS LEFT</small></div><div class="card-grid">${['rock','paper','scissors'].map(move => `<button class="hand-card" data-bluff="${move}"><canvas width="70" height="88" data-icon="${move}" aria-hidden="true"></canvas><strong>${move.toUpperCase()}</strong><small>Make them expect ${move}.</small></button>`).join('')}</div><p class="live-note">One tell this round. ${match.playerPerk.charges} remaining this match.<br>Closing this panel uses no charge.</p>`);
}
function showResult() {
  const win = match.scores.player === CONFIG.wins;
  openModal('result',heading('MATCH COMPLETE',win?'VICTORY!':'DEFEAT',win?'Outplayed. Outbluffed. Well done.':'BYTE takes this one. Your comeback starts here.')+`<div class="trophy" aria-hidden="true">${win?'★':'◆'}</div><div class="result-score">${match.scores.opponent} : ${match.scores.player}</div><p>BYTE &nbsp; / &nbsp; YOU</p><div class="reward">+${match.reward} GO COINS</div>${match.manualSelections===0?'<p>No coins this time. Choose a hand yourself to earn match rewards.</p>':''}<div class="modal-actions"><button class="pixel modal-primary" data-action="play" autofocus>PLAY AGAIN</button><button class="pixel" data-action="home">MAIN MENU</button></div><div class="modal-actions"><button class="pixel" data-action="shop">HAND SHOP</button></div>`);
}
const actions = {
  play:start, begin, home, shop:()=>shop(), settings, help:()=>help(), close:closeModal, perk:bluff,
  shoot:()=> { if(match?.confirm())sound.play('lock'); },
  menu:()=>openModal('menu',heading('RPS GO!','MENU')+`<div class="menu-stack">${match?'<button class="pixel modal-primary" data-action="close">BACK TO MATCH</button>':'<button class="pixel modal-primary" data-action="play">PLAY vs BYTE</button>'}<button class="pixel" data-action="shop">HAND SHOP</button><button class="pixel" data-action="settings">SETTINGS</button>${match?'<button class="pixel" data-action="home">MAIN MENU</button>':''}</div>${match?'<p class="live-note">The timer continues. Leaving an unfinished match earns no coins.</p>':''}`),
  multiplayer:()=>openModal('info',heading('A NEW CHALLENGER IS COMING','MULTIPLAYER<br>COMING SOON','Online duels are on the horizon. For now, sharpen your reads against BYTE. All current matches are against the bot.')+`<div class="modal-actions"><button class="pixel modal-primary" data-action="close">GOT IT</button></div>`),
  fair:()=>openModal('info',heading('A LEVEL PLAYING FIELD','FAIR PLAY','BYTE learns from your last five revealed moves and your public fake tells. It cannot read your current secret hand. Skins change your look only. Every match is free to play.')+`<div class="modal-actions"><button class="pixel" data-action="close">BACK</button></div>`),
  coins:()=>openModal('info',heading('EARNED IN THE ARENA','GO COINS','Win a finished match: +120. Finish a loss: +50. Select at least one hand yourself to earn rewards. Spend your coins on hand skins, saved on this browser. No real-money purchases.')+`<div class="modal-actions"><button class="pixel modal-primary" data-action="shop">VISIT HAND SHOP</button></div>`),
  reset:()=>openModal('reset',heading('START FRESH?','RESET YOUR SAVE?','This permanently removes your local coins, unlocked skins, settings and tutorial progress. It also ends the current match.')+`<div class="modal-actions"><button class="pixel" data-action="settings" autofocus>KEEP MY SAVE</button><button class="danger" data-action="confirm-reset">YES, RESET SAVE</button></div>`),
  'confirm-reset':()=>{ home();save=defaultSave();persist(); },
};
document.addEventListener('click',e => {
  const button = e.target.closest('button'); if (!button || button.disabled) return;
  sound.unlock(); sound.play();
  if (button.dataset.action) actions[button.dataset.action]?.();
  if (button.dataset.move) match?.select(button.dataset.move);
  if (button.dataset.bluff && match?.bluff(button.dataset.bluff)) forceClose();
  if (button.dataset.buy) { const result=purchase(save,button.dataset.buy);if(result.ok){equip(save,button.dataset.buy);sound.play('coin');persist();}shop(result.message); }
  if (button.dataset.equip && equip(save,button.dataset.equip)) { persist();shop('Equipped. Looking sharp.'); }
  render();
});
document.addEventListener('change',e=>{
  if(e.target.id==='sound-toggle'){save.settings.sound=e.target.checked;persist();}
  if(e.target.id==='motion-toggle'){save.settings.reducedMotion=e.target.checked;persist();}
});
document.addEventListener('keydown',e => {
  if (e.repeat || modal.open || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
  if (!match) return;
  if (['1','2','3'].includes(e.key)) { e.preventDefault();sound.unlock();match.select(MOVES[Number(e.key)-1]); }
  if (e.key === 'Enter' || e.key === ' ') {
    // Native button activation remains available when a non-game control has focus.
    if (e.target.closest('button') && !e.target.closest('.move,#shoot')) return;
    e.preventDefault();sound.unlock();if(match.confirm()) sound.play('lock');
  }
  render();
});
function render() {
  if (!match) return;
  const m = match;
  const signature = JSON.stringify([m.phase,m.round,m.remaining,m.selected,m.playerPerk,m.botPerk,m.bluffOpen,modalType,m.phase==='HAND_SHAKE'?Math.floor((performance.now()-m.phaseAt)/(CONFIG.timing.shake/3)):0]);
  if(signature===lastRender)return;
  lastRender=signature;
  $('#round').textContent = `ROUND ${String(m.round || 1).padStart(2,'0')}`;
  $('#byte-score').textContent = m.scores.opponent; $('#you-score').textContent=m.scores.player;
  $('#score-dots').innerHTML = ['opponent','player'].flatMap(side => Array.from({length:3},(_,i)=>`<i class="${side} ${i<m.scores[side]?'filled':''}"></i>`)).join('');
  $('#timer').textContent = m.phase === 'IDLE' ? 10 : m.remaining;
  $('#timer').classList.toggle('urgent',m.remaining>0&&m.remaining<=3);
  $('#timer-caption').textContent = m.phase === 'LOCKED' ? 'LOCKED. WAIT FOR IT…' : m.autoPick ? 'AUTO PICK' : m.phase==='PRE_ROUND'?'GET READY':m.phase==='CHOOSING'?'CHOOSE YOUR HAND':'THE SHOWDOWN';
  $('#charges').textContent = `${m.playerPerk.charges}/${CONFIG.perkCharges}`;
  $('#perk').disabled = !m.canPerk;
  $('#perk').title = m.playerPerk.charges===0?'No charges left this match':m.playerPerk.tell?'Already used this round':'Send a fake tell';
  document.querySelectorAll('[data-move]').forEach(b=>{ b.disabled=!m.canChoose;b.setAttribute('aria-pressed',b.dataset.move===m.selected); });
  $('#shoot').disabled = !m.canChoose || !m.selected;
  $('#shoot').innerHTML = m.locked?'LOCKED IN':'SHOOT <span aria-hidden="true">↗</span>';
  $('#shoot-hint').textContent = m.locked?'Reveal at zero':m.selected?'Enter / Space to lock in':'Choose a hand to lock in';
  $('#selection-hint').textContent = m.autoPick?'AUTO PICK · NO HAND SELECTED':m.selected?`${m.selected.toUpperCase()} ${m.locked?'LOCKED':'SELECTED'} · YOUR MOVE STAYS SECRET`:'YOUR MOVE STAYS SECRET';
  $('#you-tell').textContent=m.playerPerk.tell?`YOU CLAIM: ${m.playerPerk.tell.toUpperCase()}`:'';
  $('#byte-tell').textContent=m.botPerk.tell?`BYTE CLAIMS: ${m.botPerk.tell.toUpperCase()}`:'';
  if(modalType==='bluff') {
    if(!m.bluffOpen)forceClose(); else $('#bluff-clock').textContent=m.remaining;
  }
  if(m.phase!==lastPhase) {
    lastPhase=m.phase;lastBeat=-1;
    // Panels cannot mask the deadline/reveal, and unsubmitted bluffs cost nothing.
    if(m.phase==='HAND_SHAKE' && modal.open) forceClose();
    if(m.phase==='SHOOT_OVERLAY')sound.play('shoot');
    if(m.phase==='REVEAL')sound.play(m.result==='player'?'win':m.result==='tie'?'click':'loss');
    if(m.phase==='MATCH_RESULT'){rewardMatch(save,m);persist();showResult();}
    if(m.phase==='CHOOSING')$('#announcement').textContent=`Round ${m.round}. Ten seconds to choose your hand.`;
  }
  $('#shoot-overlay').hidden=m.phase!=='SHOOT_OVERLAY';
  const roundVisible=['REVEAL','ROUND_RESULT'].includes(m.phase);
  $('#round-result').hidden=!roundVisible;
  if(roundVisible) {
    $('#round-result').innerHTML=`${m.result==='tie'?'TIE! GO AGAIN.':m.result==='player'?'YOU WIN THE ROUND!':'BYTE WINS THE ROUND'}<small>BYTE: ${m.final.opponent.toUpperCase()} / YOU: ${m.final.player.toUpperCase()}${m.autoPick?' · AUTO PICK':''}</small>`;
    $('#arena').setAttribute('aria-label',`BYTE plays ${m.final.opponent}. You play ${m.final.player}. ${m.result==='tie'?'Tie':m.result==='player'?'You win':'BYTE wins'}.`);
  } else $('#arena').setAttribute('aria-label','BYTE and your hands are hidden until the reveal.');
  if(m.phase==='HAND_SHAKE') {
    const beat=Math.min(2,Math.floor((performance.now()-m.phaseAt)/(CONFIG.timing.shake/3)));
    $('#beat').textContent=['ROCK…','PAPER…','SCISSORS…'][beat];
    if(beat!==lastBeat){lastBeat=beat;sound.play('beat');}
  } else $('#beat').textContent='';
}
let frame;
function loop(now) {
  match?.update();render();
  if(match)arena.draw({now,match,skin:save.equippedSkinId,reduced:reduced()});
  else homeArena.draw({now,skin:save.equippedSkinId,reduced:reduced(),home:true});
  frame=requestAnimationFrame(loop);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){match?.update();render();}});
window.addEventListener('pagehide',()=>cancelAnimationFrame(frame));
window.addEventListener('pageshow',e=>{if(e.persisted){cancelAnimationFrame(frame);frame=requestAnimationFrame(loop);}});
syncSave();frame=requestAnimationFrame(loop);
