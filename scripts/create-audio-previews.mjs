// Original synthesized tonal stingers, NOT voice recordings. Reproducible, no dependencies.
import { mkdir,writeFile } from 'node:fs/promises';
await mkdir(new URL('../assets/audio/',import.meta.url),{recursive:true});
for(const [cue,hz,duration] of [['rock',110,.22],['paper',165,.25],['scissors',220,.28],['shoot',82.4,.42]]){
  const rate=22050,count=Math.floor(rate*duration),wav=Buffer.alloc(44+count*2);
  wav.write('RIFF');wav.writeUInt32LE(36+count*2,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(count*2,40);
  for(let i=0;i<count;i++){const t=i/rate,p=t/duration,env=Math.min(1,t/.008)*Math.pow(1-p,2);const tone=Math.sin(2*Math.PI*hz*t)+.3*Math.sin(2*Math.PI*hz*2*t)+.12*Math.sin(2*Math.PI*hz*4*t);wav.writeInt16LE(Math.round(tone*env*.36*32767),44+i*2);}
  await writeFile(new URL(`../assets/audio/${cue}-preview.wav`,import.meta.url),wav);
}
