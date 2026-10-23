import { CONFIG } from '../config.js';
import { paintIcon } from '../render/hands.js';

// Public-event-only notification; never accepts a locked move or truth flag.
export class BluffAlert {
  constructor(root, announce, sound, paint = paintIcon) { this.root=root;this.announce=announce;this.sound=sound;this.paint=paint;this.until=0; }
  show(event, now) {
    if(event.actor!=='opponent'||event.type!=='PUBLIC_TELL'||now-event.at>CONFIG.timing.bluffAlert)return;
    this.root.innerHTML=`<canvas width="40" height="48" aria-hidden="true"></canvas><div><small>BYTE WILL CHOOSE...</small><strong>${event.move.toUpperCase()}</strong><em>It's a lieeeeee...</em></div>`;
    this.paint(this.root.querySelector('canvas'),event.move,'byte');
    this.until=now+CONFIG.timing.bluffAlert;this.root.hidden=false;this.root.showPopover?.();
    this.announce.textContent=`BYTE publicly claims ${event.move}. It's a lieeeeee... This is a bluff, not a guaranteed prediction.`;
    this.sound.play('bluff');
  }
  update(now, active) { if(!active||now>=this.until)this.clear(); }
  clear() { if(this.root.hidePopover&&this.root.matches(':popover-open'))this.root.hidePopover();this.root.hidden=true;this.until=0; }
}
