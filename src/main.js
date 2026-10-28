import { Match } from './core/match.js';
import { loadSave, persistSave, defaultSave, LEGACY_SAVE_KEY } from './core/storage.js';
import { purchase, equip, rewardMatch } from './core/economy.js';
import { SKINS, HOME_MAPS, CONFIG, MOVES } from './config.js';
import { paintIcon } from './render/hands.js';
import { handAssets } from './render/hand-assets.js';
import { Arena } from './render/arena.js';
import { Sound } from './ui/sound.js';
import { HomeReturn } from './core/home-return.js';
import { HomeHubRenderer } from './render/home-hub.js';
import { skinCarousel, mapCards } from './ui/customization.js';
import { Announcer, CueTracker } from './ui/announcer.js';
import { AUDIO_CONFIG } from './ui/audio-config.js';
import { roundHistory } from './ui/round-history.js';
import { BluffAlert } from './ui/bluff-alert.js';

const $ = selector => document.querySelector(selector);
let storage;
try { storage = window.localStorage; } catch { storage = null; }
let save = loadSave(storage), match = null, modalType = null, lastPhase = '', lastBeat = -1, lastRender = '';
const modal = $('#modal'), sound = new Sound(), arena = new Arena($('#arena')), homeArena = new Arena($('#home-canvas'));
const hubRenderer = new HomeHubRenderer($('#hub-canvas')), returnHome = new HomeReturn();
const incomingBluff = new BluffAlert($('#bluff-alert'), $('#announcement'), sound);
const announcer=new Announcer(), cues=new CueTracker();
let returnFocus=null, feedbackUntil=0, resumeAudioPending=false;
function feedback(text,kind='notice'){const node=$('#game-feedback');node.textContent=text;node.dataset.kind=kind;node.hidden=false;feedbackUntil=(match?.clock()??performance.now())+3500;$('#announcement').textContent=text;}
function unlockAudio(){sound.unlock();announcer.unlock(sound.ctx);}
let previewSkin = save.equippedSkinId, previewPose = 'rock', modalRenderer = null;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = () => save.settings.reducedMotion ?? motionPreference.matches;
function persist() { $('#save-warning').hidden = persistSave(storage,save); syncSave(); }
function syncSave() {
  $('#balance').textContent = save.coins.toLocaleString();
  $('.wallet').setAttribute('aria-label',`${save.coins} GO Coins. Open shop information`);
  $('#skin-label').textContent = SKINS.find(s => s.id === save.equippedSkinId).name.toUpperCase();
  sound.configure(save.settings.sound,save.settings.sfxVolume);
  announcer.configure(save.settings.sound,save.settings.announcerVolume);
  document.documentElement.classList.toggle('reduced',reduced());
  document.documentElement.classList.toggle('motion-enabled',!reduced());
  document.querySelectorAll('[data-icon]').forEach(c => paintIcon(c,c.dataset.icon,c.dataset.skin || save.equippedSkinId));
}
function updateHub(message = '') {
  $('#hub-customization').innerHTML = skinCarousel(save, previewSkin, previewPose);
  const map = HOME_MAPS.find(m => m.id === save.equippedMapId);
  $('#hub-map-name').textContent = map.name.toUpperCase();
  $('#hub-preview-state').textContent = previewSkin === save.equippedSkinId ? 'EQUIPPED' : 'PREVIEW ONLY';
  $('#hub-canvas').setAttribute('aria-label', `${SKINS.find(s=>s.id===previewSkin).name}, ${previewPose} pose in ${map.name}. ${previewSkin===save.equippedSkinId?'Equipped.':'Preview only.'}`);
  $('#hub-message').textContent = message;
  syncSave();
}
motionPreference.addEventListener('change',syncSave);
function openModal(type,html) {
  if (modalType === 'bluff' && type !== 'bluff') match?.cancelBluff();
  if(!modal.open)returnFocus=document.activeElement;
  modal.dataset.type=type;
  modalType = type; $('#modal-body').innerHTML = html;
  modalRenderer = null;
  $('#close-modal').hidden = ['tutorial','result'].includes(type);
  if (!modal.open) modal.showModal();
  syncSave();
  (modal.querySelector('[autofocus]') || (type === 'tutorial' ? modal.querySelector('[data-action="begin"]') : $('#close-modal')))?.focus();
}
function closeModal() {
  if (modalType === 'tutorial') { begin(); return; }
  if (modalType === 'result') return;
  if (modalType === 'bluff') match?.cancelBluff();
  if (match?.phase === 'MATCH_RESULT') { showResult(); return; }
  forceClose();
}
function forceClose() { const wasOpen=modal.open;modal.close(); modalType = null; modalRenderer = null;if(wasOpen){const target=returnFocus?.isConnected&&!returnFocus.disabled?returnFocus:$('#game').hidden?$('.settings-button'):$('[data-move]');target?.focus({preventScroll:true});} }
$('#close-modal').addEventListener('click',closeModal);
modal.addEventListener('cancel',e => { e.preventDefault();closeModal(); });
const heading = (label,title,subtitle='') => `<div class="modal-eyebrow">${label}</div><h2 id="modal-title">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}`;
function help(first = false) {
  openModal(first ? 'tutorial' : 'help',heading('WELCOME TO THE ARENA','THREE MOVES.<br>ONE MIND GAME.','Outsmart BYTE. First to 3 wins. Ties replay.')+
    `<div class="help-steps"><article><b>01 / CHOOSE</b><p>Pick rock, scissors or paper. You share a 20-second clock with BYTE. Keys 1, 2, 3 work too.</p></article><article><b>02 / BLUFF</b><p>Fake a move before BYTE locks. Claims may influence BYTE; your true move stays secret. Expired selection costs one charge. If BYTE locks first, your pending charge is refunded.</p></article><article><b>03 / SHOOT</b><p>SHOOT, Enter or Space locks your move. When both are ready, the showdown begins early. Neither can change a locked hand.</p></article></div><div class="help-rule">Rock beats scissors · Scissors beats paper · Paper beats rock</div><p class="live-note">No selection at zero? AUTO PICK. Ties mean another round.<br>Eligible victory: +${CONFIG.rewards.victory} coins. Completed defeat: −${CONFIG.rewards.lossPerSpentCharge} per spent bluff, limited to your balance. Unused bluffs and abandoned matches cost nothing.</p><div class="modal-actions"><button class="pixel modal-primary" data-action="${first?'begin':'close'}">${first?"LET’S GO!":"GOT IT"}</button></div>`);
}
function start() {
  returnHome.cancel(); incomingBluff.clear();announcer.stop();sound.stop();cues.reset();feedbackUntil=0;$('#game-feedback').hidden=true; forceClose(); match?.stop(); match = new Match(); lastPhase = ''; lastBeat = -1; lastRender = '';
  $('#home').hidden = true; $('#hub').hidden = true; $('#game').hidden = false; $('#perk').hidden = false; $('.tiny-brand').hidden = true;
  if (!save.tutorialSeen) help(true); else match.start();
  render();
}
function begin() { save.tutorialSeen = true; persist(); forceClose(); match?.start(); }
function home() {
  $('#announcement').textContent='';
  returnHome.cancel(); incomingBluff.clear();announcer.stop();sound.stop();cues.reset();feedbackUntil=0;$('#game-feedback').hidden=true; forceClose(); match?.stop(); match = null;
  $('#home').hidden = save.tutorialSeen; $('#hub').hidden = !save.tutorialSeen; $('#game').hidden = true; $('#perk').hidden = true; $('.tiny-brand').hidden = false;
  previewSkin = save.equippedSkinId; updateHub();
}
function shop(message = '') {
  openModal('shop', heading('COSMETICS ONLY','THE HAND SHOP',`${save.coins.toLocaleString()} GO Coins · Preview any skin. Equip what you own.`)+
    `<div class="customizer"><canvas id="customizer-canvas" width="640" height="360" role="img" aria-label="Large ${SKINS.find(s=>s.id===previewSkin).name} ${previewPose} preview"></canvas><div id="modal-customization">${skinCarousel(save,previewSkin,previewPose)}</div></div><p class="shop-message" role="status">${message||`Earn ${CONFIG.rewards.victory} coins for an eligible victory. Make this look yours.`}</p><button class="pixel modal-primary" data-action="maps">EXPLORE HOME MAPS</button>${match&&match.phase!=='MATCH_RESULT'?'<p class="live-note">Your round timer continues while browsing.</p>':''}`);
  modalRenderer = new HomeHubRenderer($('#customizer-canvas'));
}
function maps(message = '') {
  openModal('maps', heading('YOUR OWN CORNER OF THE COSMOS','HOME MAPS',`${save.coins.toLocaleString()} GO Coins · A new atmosphere. The same fair game.`)+`<div class="map-grid">${mapCards(save)}</div><p class="shop-message" role="status">${message||'Map and skin purchases use the same GO Coin balance.'}</p><button class="pixel modal-primary" data-action="shop">HAND SKINS</button>${match&&match.phase!=='MATCH_RESULT'?'<p class="live-note">Your round timer continues while browsing.</p>':''}`);
  document.querySelectorAll('[data-map-preview]').forEach(canvas => new HomeHubRenderer(canvas).draw({map:canvas.dataset.mapPreview,thumbnail:true,reduced:true}));
}
function refreshCustomization(message = '') {
  const focused = document.activeElement;
  const containerId = focused?.closest('#hub-customization, #modal-customization')?.id;
  const focusAttribute = ['data-cycle-skin','data-preview-skin','data-pose'].find(name=>focused?.hasAttribute(name));
  const focusValue = focusAttribute ? focused.getAttribute(focusAttribute) : null;
  updateHub(message);
  if(modalType==='shop') {
    $('#modal-customization').innerHTML=skinCarousel(save,previewSkin,previewPose);
    $('#customizer-canvas').setAttribute('aria-label',`Large ${SKINS.find(s=>s.id===previewSkin).name} ${previewPose} preview`);
    if(message) $('.shop-message').textContent=message;
    $('#modal-body > p').textContent=`${save.coins.toLocaleString()} GO Coins · Preview any skin. Equip what you own.`;
    syncSave();
  }
  if(containerId && focusAttribute) document.getElementById(containerId).querySelector(`[${focusAttribute}="${focusValue}"]`)?.focus({preventScroll:true});
  else if(containerId) document.getElementById(containerId).querySelector('[data-cycle-skin]')?.focus({preventScroll:true});
}
function settings() {
  openModal('settings',heading('MAKE IT YOURS','SETTINGS')+`<label class="setting-row"><span>Arcade sound<small>Original synthesized sound effects</small></span><input id="sound-toggle" type="checkbox" ${save.settings.sound?'checked':''}></label><label class="setting-row"><span>Reduced motion<small>Gentler reveals and no hand shaking</small></span><input id="motion-toggle" type="checkbox" ${reduced()?'checked':''}></label><label class="setting-row"><span>SFX volume</span><input id="sfx-volume" aria-label="SFX volume" type="range" min="0" max="1" step="0.05" value="${save.settings.sfxVolume}"></label><label class="setting-row"><span>Announcer cue volume<small>Synthesized preview cues · no voice recordings</small></span><input id="announcer-volume" aria-label="Announcer cue volume" type="range" min="0" max="1" step="0.05" value="${save.settings.announcerVolume}"></label><div class="modal-actions"><button class="pixel" data-action="test-sfx">TEST SFX</button><button class="pixel" data-action="test-cue">TEST CUE</button></div><p>Controls: 1 Rock · 2 Scissors · 3 Paper<br>Enter / Space: SHOOT · Escape: close a panel</p><div class="modal-actions"><button class="pixel" data-action="help">HOW TO PLAY</button><button class="danger" data-action="reset">RESET LOCAL SAVE</button></div>${match ? '<p class="live-note">The round timer keeps running in panels.</p>' : ''}`);
}
function bluff() {
  if (!match?.openBluff()) {if(match)feedback(perkReason(match));return;}
  sound.play('bluff');
  openModal('bluff',heading('SIKE OUT!','SELECT A HAND','Fake your next move')+`<div class="modal-clock"><span id="bluff-clock">${match.remaining}</span><small>SECONDS LEFT</small></div><div class="card-grid">${['rock','paper','scissors'].map(move => `<button class="hand-card" data-bluff="${move}" style="--card-index:${['rock','paper','scissors'].indexOf(move)}"><canvas width="180" height="180" data-icon="${move}" aria-hidden="true"></canvas><strong>${move.toUpperCase()}</strong><small>PUBLIC CLAIM</small></button>`).join('')}</div><p class="live-note"><strong>1 CHARGE RESERVED</strong> · ${match.playerPerk.charges} still available.<br>Timer continues. Unsubmitted Sike Out! at zero costs 1 charge.<br>BYTE locks first? Your pending charge is refunded.</p>`);
}
function showResult() {
  const win = match.scores.player === CONFIG.wins;
  const signed=match.reward<0?`−${Math.abs(match.reward)}`:`+${match.reward}`;
  openModal('result',heading('MATCH COMPLETE',win?'VICTORY!':'DEFEAT',win?'Outplayed. Outbluffed. Welcome back, champion.':'BYTE takes this one. Your comeback starts at home.')+`<div class="trophy ${win?'celebrate':''}" aria-hidden="true">${win?'★':'◆'}</div><div class="result-score">${match.scores.opponent} : ${match.scores.player}</div><p>BYTE &nbsp; / &nbsp; YOU</p><div class="reward ${match.reward<0?'deduction':''}">${signed} GO COINS</div><p>${win&&match.manualSelections===0?'No manual hand selections, so no victory reward.':!win?`${match.playerPerk.spent} bluff charge${match.playerPerk.spent===1?'':'s'} spent · ${Math.abs(match.reward)} coins deducted. Balance: ${save.coins}.`:'Your next showdown awaits.'}</p><div class="modal-actions"><button class="pixel modal-primary" data-action="home" autofocus>RETURN HOME</button>${win?'<button class="pixel" data-action="stay">STAY HERE</button>':'<button class="pixel" data-action="play">REMATCH</button>'}</div>${win?'<p id="home-countdown" role="status">Returning home in 3…</p>':''}`);
}
const actions = {
  'test-sfx':()=>sound.play('shoot'),
  'test-cue':()=>announcer.play('shoot'),
  history:()=>openModal('history',heading('MATCH INTELLIGENCE','RECENT ROUNDS')+roundHistory(match?.recentRounds||[])),
  play:start, begin, home, shop:()=>shop(), maps:()=>maps(), settings, help:()=>help(), close:closeModal, perk:bluff,
  stay:()=>{returnHome.cancel();$('#home-countdown').textContent='Take your time. Your home is ready when you are.';},
  shoot:()=> { if(match?.confirm()){sound.play('lock');feedback('HAND LOCKED · Waiting for BYTE');} },
  menu:()=>openModal('menu',heading('RPS GO!','MENU')+`<div class="menu-stack">${match?'<button class="pixel modal-primary" data-action="close">BACK TO MATCH</button>':'<button class="pixel modal-primary" data-action="play">PLAY vs BYTE</button>'}<button class="pixel" data-action="shop">HAND SHOP</button><button class="pixel" data-action="settings">SETTINGS</button>${match?'<button class="pixel" data-action="home">MAIN MENU</button>':''}</div>${match?'<p class="live-note">The timer continues. Leaving an unfinished match earns no coins.</p>':''}`),
  multiplayer:()=>openModal('info',heading('A NEW CHALLENGER IS COMING','MULTIPLAYER<br>COMING SOON','Online duels are on the horizon. For now, sharpen your reads against BYTE. All current matches are against the bot.')+`<div class="modal-actions"><button class="pixel modal-primary" data-action="close">GOT IT</button></div>`),
  fair:()=>openModal('info',heading('A LEVEL PLAYING FIELD','FAIR PLAY','BYTE learns from your last five revealed moves and your public fake tells. It cannot read your current secret hand. Skins change your look only. Every match is free to play.')+`<div class="modal-actions"><button class="pixel" data-action="close">BACK</button></div>`),
  coins:()=>openModal('info',heading('EARNED IN THE ARENA','GO COINS',`Win with a manually selected hand: +${CONFIG.rewards.victory}. Completed defeat: −${CONFIG.rewards.lossPerSpentCharge} per submitted or expired Sike Out! charge, limited to your balance. No spent charges means no deduction. Abandoned matches have no settlement. Buy hand skins and home maps with the same wallet.`)+`<div class="modal-actions"><button class="pixel modal-primary" data-action="shop">HAND SKINS</button><button class="pixel" data-action="maps">HOME MAPS</button></div>`),
  reset:()=>openModal('reset',heading('START FRESH?','RESET YOUR SAVE?','This permanently removes your local coins, unlocked skins, settings and tutorial progress. It also ends the current match.')+`<div class="modal-actions"><button class="pixel" data-action="settings" autofocus>KEEP MY SAVE</button><button class="danger" data-action="confirm-reset">YES, RESET SAVE</button></div>`),
  'confirm-reset':()=>{ returnHome.cancel();try{storage?.removeItem(LEGACY_SAVE_KEY);}catch{}save=defaultSave();persist();home(); },
};
document.addEventListener('click',e => {
  const button = e.target.closest('button'); if (!button || button.disabled) return;
  unlockAudio();
  // Meaningful actions get one specific sound, without a second generic click.
  if(!button.dataset.bluff&&!button.dataset.move&&!['shoot','perk','test-sfx','test-cue'].includes(button.dataset.action))sound.play();
  if (button.dataset.action) actions[button.dataset.action]?.();
  if (button.dataset.move && match?.select(button.dataset.move)) sound.play('select');
  if (button.dataset.bluff && match?.bluff(button.dataset.bluff)) {
    forceClose();
    sound.play('claim');feedback(`YOU CLAIM: ${button.dataset.bluff.toUpperCase()} · Your true move stays secret`,'claim');
    const claimed=document.createElement('canvas');claimed.width=64;claimed.height=64;claimed.setAttribute('aria-hidden','true');$('#game-feedback').prepend(claimed);paintIcon(claimed,button.dataset.bluff,save.equippedSkinId);
    if(!reduced())$('#you-tell').animate([{opacity:0,transform:'scale(.85)'},{opacity:1,transform:'scale(1.12)'},{opacity:1,transform:'scale(1)'}],{duration:400});
  }
  if (button.dataset.previewSkin) { previewSkin=button.dataset.previewSkin;refreshCustomization(); }
  if (button.dataset.cycleSkin) { previewSkin=SKINS[(SKINS.findIndex(s=>s.id===previewSkin)+Number(button.dataset.cycleSkin)+SKINS.length)%SKINS.length].id;refreshCustomization(); }
  if (button.dataset.pose) { previewPose=button.dataset.pose;refreshCustomization(); }
  if (button.dataset.buy) { const result=purchase(save,button.dataset.buy);if(result.ok){equip(save,button.dataset.buy);sound.play('coin');persist();}refreshCustomization(result.message); }
  if (button.dataset.equip && equip(save,button.dataset.equip)) { persist();refreshCustomization('Equipped. Your arena hand is ready.'); }
  if (button.dataset.buyMap) { const result=purchase(save,button.dataset.buyMap,'map');if(result.ok){equip(save,button.dataset.buyMap,'map');sound.play('coin');persist();updateHub();}maps(result.message); }
  if (button.dataset.equipMap && equip(save,button.dataset.equipMap,'map')) { persist();updateHub();maps('Home map equipped.'); }
  render();
});
document.addEventListener('change',e=>{
  if(e.target.id==='sound-toggle'){save.settings.sound=e.target.checked;persist();}
  if(e.target.id==='sfx-volume'){save.settings.sfxVolume=Number(e.target.value);persist();}
  if(e.target.id==='announcer-volume'){save.settings.announcerVolume=Number(e.target.value);persist();}
  if(e.target.id==='motion-toggle'){save.settings.reducedMotion=e.target.checked;persist();}
});
document.addEventListener('input',e=>{
  if(e.target.id==='sfx-volume'){unlockAudio();save.settings.sfxVolume=Number(e.target.value);persist();}
  if(e.target.id==='announcer-volume'){unlockAudio();save.settings.announcerVolume=Number(e.target.value);persist();}
});
document.addEventListener('keydown',e => {
  if (e.repeat || modal.open || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable) return;
  if (!match || e.target.closest('a,summary') || (e.target.closest('button') && !e.target.closest('.move,#shoot'))) return;
  if (['1','2','3'].includes(e.key)) { e.preventDefault();unlockAudio();if(match.select(MOVES[Number(e.key)-1]))sound.play('select'); }
  if (e.key === 'Enter' || e.key === ' ') {
    // Native button activation remains available when a non-game control has focus.
    if (e.target.closest('button') && !e.target.closest('.move,#shoot')) return;
    e.preventDefault();unlockAudio();if(match.confirm()){sound.play('lock');feedback('HAND LOCKED · Waiting for BYTE');}
  }
  render();
});
function perkReason(m){
  return m.bluffOpen?'1 charge reserved':m.botReady?'BYTE already locked':m.locked?'Your hand is locked':!m.active?'Available next round':m.playerPerk.charges===0?'No charges left':m.playerPerk.roundUsed?'Already used this round':'Fake a move before BYTE locks';
}
function render() {
  if (!match) return;
  const m = match;
  $('#game').dataset.phase=m.phase;
  const signature = JSON.stringify([m.phase,m.round,m.remaining,m.selected,m.playerReady,m.botReady,m.playerPerk,m.botPerk,m.bluffOpen,modalType,m.phase==='HAND_SHAKE'?Math.floor((m.clock()-m.phaseAt)/AUDIO_CONFIG.beatMs):0]);
  if(signature===lastRender)return;
  lastRender=signature;
  $('#round').textContent = `ROUND ${String(m.round || 1).padStart(2,'0')}`;
  $('#byte-score').textContent = m.scores.opponent; $('#you-score').textContent=m.scores.player;
  $('#score-dots').innerHTML = ['opponent','player'].flatMap(side => Array.from({length:3},(_,i)=>`<i class="${side} ${i<m.scores[side]?'filled':''}"></i>`)).join('');
  $('#timer').textContent = m.remaining;
  $('#timer').classList.toggle('urgent',m.remaining>0&&m.remaining<=3);
  $('#timer-caption').textContent = m.phase==='BOTH_READY'?'BOTH READY!':m.phase==='LOCKED'?'WAITING FOR BYTE…':m.autoPick?'AUTO PICK':m.phase==='PRE_ROUND'?'GET READY':m.phase==='CHOOSING'?'CHOOSE YOUR HAND':['REVEAL','ROUND_RESULT'].includes(m.phase)?'ROUND RESULT':'SHOWDOWN';
  $('#timer-caption').classList.toggle('waiting',m.phase==='LOCKED');
  $('#ready-state').textContent = m.active ? (m.botReady?'BYTE IS READY · YOUR MOVE':m.playerReady?'YOUR HAND IS LOCKED':'BOTH HANDS STAY SECRET') : m.phase==='BOTH_READY'?'LET’S GO!':'';
  $('#charges').textContent = `${m.playerPerk.charges}/${CONFIG.perkCharges}`;
  $('#perk').setAttribute('aria-disabled',String(!m.canPerk));
  $('#perk').dataset.state=m.bluffOpen?'pending':m.canPerk?'ready':m.playerPerk.roundUsed?'used':'disabled';
  $('#perk-reason').textContent=perkReason(m);
  $('#perk').title=perkReason(m);
  document.querySelectorAll('[data-move]').forEach(b=>{ b.disabled=!m.canChoose||m.bluffOpen;b.setAttribute('aria-pressed',b.dataset.move===m.selected); });
  $('#shoot').disabled = !m.canChoose || !m.selected || m.bluffOpen;
  $('#shoot').innerHTML = m.locked?'LOCKED IN':'SHOOT <span aria-hidden="true">↗</span>';
  $('#shoot-hint').textContent = m.locked?'Showdown when both are ready':m.selected?'Enter / Space to lock in':'Choose a hand to lock in';
  $('#selection-hint').textContent = m.autoPick?'AUTO PICK · NO HAND SELECTED':m.selected?`${m.selected.toUpperCase()} ${m.locked?'LOCKED':'SELECTED'} · YOUR MOVE STAYS SECRET`:'YOUR MOVE STAYS SECRET';
  $('#you-tell').textContent=m.playerPerk.tell?`YOU CLAIM: ${m.playerPerk.tell.toUpperCase()}`:'';
  // The incoming alert owns BYTE's public claim display through the reveal.
  if(modalType==='bluff') {
    if(!m.bluffOpen)forceClose(); else $('#bluff-clock').textContent=m.remaining;
  }
  if(m.phase!==lastPhase) {
    lastPhase=m.phase;lastBeat=-1;
    if(m.phase==='PRE_ROUND'){$('#game-feedback').hidden=true;feedbackUntil=0;}
    // Resolution closes panels after the core settles any pending reservation.
    if(['BOTH_READY','HAND_SHAKE'].includes(m.phase)) { if(modal.open)forceClose(); }

    if(m.phase==='REVEAL')sound.play(m.result==='player'?'win':m.result==='tie'?'click':'loss');
    if(m.phase==='MATCH_RESULT'){rewardMatch(save,m);persist();showResult();if(m.scores.player===CONFIG.wins){returnHome.start(m.id);returnHome.setPaused(document.hidden);}}
    if(m.phase==='CHOOSING')$('#announcement').textContent=`Round ${m.round}. Twenty seconds to choose. The showdown starts when both are ready.`;
  }
  $('#history-count').textContent=m.recentRounds.length;
  if(modalType==='history')$('#modal-body').innerHTML=heading('MATCH INTELLIGENCE','RECENT ROUNDS')+roundHistory(m.recentRounds);
  $('#shoot-overlay').hidden=m.phase!=='SHOOT_OVERLAY';
  const roundVisible=['REVEAL','ROUND_RESULT'].includes(m.phase);
  $('#round-result').hidden=!roundVisible;
  if(roundVisible) {
    $('#round-result').innerHTML=`${m.result==='tie'?'TIE! GO AGAIN.':m.result==='player'?'YOU WIN THE ROUND!':'BYTE WINS THE ROUND'}<small>BYTE: ${m.final.opponent.toUpperCase()} / YOU: ${m.final.player.toUpperCase()}${m.autoPick?' · AUTO PICK':''}</small>`;
    $('#arena').setAttribute('aria-label',`BYTE plays ${m.final.opponent}. You play ${m.final.player}. ${m.result==='tie'?'Tie':m.result==='player'?'You win':'BYTE wins'}.`);
  } else $('#arena').setAttribute('aria-label','BYTE and your hands are hidden until the reveal.');
  if(m.phase==='HAND_SHAKE') {
    const beat=Math.min(2,Math.floor((m.clock()-m.phaseAt)/AUDIO_CONFIG.beatMs));
    $('#beat').textContent=['ROCK…','PAPER…','SCISSORS…'][beat];
    lastBeat=beat;
  } else $('#beat').textContent='';
}
let frame;
function loop(now) {
  match?.update();
  // Match events use its clock; the RAF timestamp can precede this update slightly.
  const bluffNow=match?.clock()??now;
  const bluffContext={phase:match?.phase,round:match?.round,reduced:reduced()};
  incomingBluff.update(bluffNow,bluffContext);
  for(const event of match?.drainEvents()||[]) {
    if(event.type==='PUBLIC_TELL'&&event.actor==='opponent')incomingBluff.show(event,bluffNow,bluffContext);
    if(event.type==='PERK_EXPIRED')feedback('Sike Out expired · 1 charge spent · No claim sent');
    if(event.type==='PERK_REFUNDED')feedback('BYTE already locked its hand — Sike Out! refunded');
  }
  render();
  if(bluffNow>=feedbackUntil)$('#game-feedback').hidden=true;
  const cue=cues.take(match,bluffNow);
  if(cue&&!document.hidden){announcer.play(cue.name);sound.play(cue.name);}
  if(match?.phase==='MATCH_RESULT'&&returnHome.id) {
    if(returnHome.tick(match.id))home();
    else if($('#home-countdown')) {
      const text=`Returning home in ${returnHome.seconds}…`;
      if($('#home-countdown').textContent!==text)$('#home-countdown').textContent=text;
    }
  }
  if(match)arena.draw({now,match,skin:save.equippedSkinId,reduced:reduced()});
  else if(!$('#hub').hidden)hubRenderer.draw({now,map:save.equippedMapId,skin:previewSkin,pose:previewPose,reduced:reduced()});
  else homeArena.draw({now,skin:save.equippedSkinId,reduced:reduced(),home:true});
  if(modal.open&&modalRenderer)modalRenderer.draw({now,map:save.equippedMapId,skin:previewSkin,pose:previewPose,reduced:reduced()});
  if(resumeAudioPending&&!document.hidden){announcer.suspend(false);sound.suspend(false);resumeAudioPending=false;}
  frame=requestAnimationFrame(loop);
}
function backgroundAudio(hidden) {
  returnHome.setPaused(hidden);
  if(hidden){resumeAudioPending=false;announcer.suspend(true);sound.suspend(true);return;}
  // Resolve elapsed gameplay while audio is still suspended, then consume the
  // current beat. Future beats keep their original timing; no backlog plays.
  match?.update();cues.skip(match,match?.clock()??performance.now());render();
  // Drain any public events accumulated while hidden before enabling new audio.
  resumeAudioPending=true;
}
document.addEventListener('visibilitychange',()=>backgroundAudio(document.hidden));
window.addEventListener('pagehide',()=>{backgroundAudio(true);cancelAnimationFrame(frame);});
window.addEventListener('pageshow',e=>{if(e.persisted){backgroundAudio(document.hidden);cancelAnimationFrame(frame);frame=requestAnimationFrame(loop);}});
home();syncSave();frame=requestAnimationFrame(loop);
// Non-blocking: the existing procedural artwork remains visible until ready.
handAssets.load().then(syncSave);
