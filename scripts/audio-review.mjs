// Extends the existing isolated review copy only. No QA controls ship in dist/.
import './part3-review.mjs';
import { readFile, writeFile } from 'node:fs/promises';
const path=new URL('../output/part3-review/src/main.js',import.meta.url);
let main=await readFile(path,'utf8');
main += `
const audioReviewPanel=document.createElement('section');
audioReviewPanel.style.cssText='padding:20px;background:#071b32;color:#acefff;font:14px monospace';
audioReviewPanel.innerHTML='<h2>Isolated audio verification</h2><button id="qa-audio-check">RUN AUDIO CHECKS</button> <button id="qa-audio-hidden">SIMULATE BACKGROUND</button> <button id="qa-audio-return">SIMULATE RETURN</button> <button id="qa-audio-beat">NEXT AUDIO BEAT</button><p id="qa-audio-results">Not run</p><p id="qa-audio-meter"></p><p id="qa-audio-cues"></p>';
document.body.append(audioReviewPanel);
const audioReviewCues=[];
const originalAnnounce=announcer.play.bind(announcer);
announcer.play=cue=>{audioReviewCues.push(cue);if(audioReviewCues.length>24)audioReviewCues.shift();return originalAnnounce(cue);};
setInterval(()=>{
 document.querySelector('#qa-audio-meter').textContent='Context: '+sound.ctx?.state+' | Loaded cues: '+announcer.buffers.size+' | Active announcer: '+announcer.sources.size+' | Active SFX: '+sound.active.size+' | Suspended: '+sound.suspended+' | SFX volume: '+sound.volume+' | Cue volume: '+announcer.volume+' | Sound enabled: '+sound.enabled;
 document.querySelector('#qa-audio-cues').textContent='Cue requests: '+audioReviewCues.join(' → ');
},100);
document.querySelector('#qa-audio-hidden').onclick=()=>backgroundAudio(true);
document.querySelector('#qa-audio-return').onclick=()=>backgroundAudio(false);
document.querySelector('#qa-audio-beat').onclick=()=>{match?.step(AUDIO_CONFIG.beatMs);window.scrollTo(0,0);};
document.querySelector('#qa-audio-check').onclick=async()=>{
 const result=document.querySelector('#qa-audio-results'),passed=[];
 const check=(condition,label)=>{if(!condition)throw Error(label);passed.push(label);};
 try {
  unlockAudio();await sound.ready;await announcer.unlock(sound.ctx);await sound.ctx.resume();
  check(sound.ctx.state==='running','gesture unlock running');check(announcer.buffers.size===4,'4 WAVs decoded');check(sound.buffers.size===13,'13 SFX cached');
  announcer.configure(true,.6);sound.configure(true,.7);
  for(const cue of ['rock','paper','scissors','shoot']){check(announcer.play(cue),'play '+cue);check(announcer.sources.size===1,'single voice '+cue);sound.play(cue);}
  sound.suspend(true);announcer.suspend(true);check(sound.active.size===0&&announcer.sources.size===0,'background cleanup');
  check(!sound.play('shoot')&&!announcer.play('shoot'),'no hidden playback');sound.suspend(false);announcer.suspend(false);
  sound.play('shoot');announcer.play('shoot');sound.configure(false,.7);announcer.configure(false,.6);check(sound.active.size===0&&announcer.sources.size===0,'mute cleanup');
  sound.configure(true,.7);announcer.configure(true,.6);sound.play('rock');announcer.play('rock');await new Promise(r=>setTimeout(r,500));check(sound.active.size===0&&announcer.sources.size===0,'natural end cleanup');
  const missing=new Announcer({fetcher:async()=>{throw Error('QA unavailable');}});await missing.unlock(sound.ctx);missing.play('rock');check(missing.sources.size===1,'missing-file tone fallback');missing.stop();check(missing.sources.size===0,'fallback stop');missing.dispose();
  const offline=new OfflineAudioContext(1,48000,48000);
  for(let i=0;i<4;i++){const source=offline.createBufferSource(),gain=offline.createGain();source.buffer=sound.buffers.get('shoot');gain.gain.value=AUDIO_CONFIG.sfxGain;source.connect(gain);gain.connect(offline.destination);source.start();}
  const voice=offline.createBufferSource(),voiceGain=offline.createGain();voice.buffer=announcer.buffers.get('shoot');voiceGain.gain.value=AUDIO_CONFIG.announcerGain;voice.connect(voiceGain);voiceGain.connect(offline.destination);voice.start();
  const rendered=await offline.startRendering();let peak=0;for(const value of rendered.getChannelData(0))peak=Math.max(peak,Math.abs(value));check(peak>0&&peak<1,'48kHz offline mix peak '+peak.toFixed(4));
  result.textContent='PASS: '+passed.join(' · ');
 }catch(error){result.textContent='FAIL: '+error.message;}
 finally{sound.stop();announcer.stop();syncSave();}
};
`;
await writeFile(path,main);
console.log('Audio QA: http://127.0.0.1:8000/output/part3-review/ (session-only progress and controlled clock)');
