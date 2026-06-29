const fs = require('fs');
const path = require('path');

function createWavBuffer(duration, sampleRate, sampleGenerator) {
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples; // 1 byte per sample for 8-bit mono
  const fileSize = 44 + dataSize;
  const buffer = Buffer.alloc(fileSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);

  // fmt subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size
  buffer.writeUInt16LE(1, 20);  // AudioFormat (PCM)
  buffer.writeUInt16LE(1, 22);  // NumChannels (1 for mono)
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28); // ByteRate (sampleRate * 1 channel * 1 byte)
  buffer.writeUInt16LE(1, 32);  // BlockAlign (1 byte)
  buffer.writeUInt16LE(8, 34);  // BitsPerSample (8)

  // data subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Write samples
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const value = sampleGenerator(t, i); // returns float between -1.0 and 1.0
    // Convert -1.0..1.0 to 0..255 (unsigned 8-bit PCM)
    const byteVal = Math.max(0, Math.min(255, Math.floor((value + 1) * 127.5)));
    buffer.writeUInt8(byteVal, 44 + i);
  }

  return buffer;
}

// Ensure output directory exists
const audioDir = path.join(__dirname, '..', 'public', 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// Helper to write a wave file
const saveWav = (name, buffer) => {
  fs.writeFileSync(path.join(audioDir, name), buffer);
  console.log(`Generated ${name}`);
};

// Loop Duration set to 64.0 seconds (minimal 60-120 seconds target, power of 2 beats)
const LOOP_DURATION = 64.0;
const SAMPLE_RATE = 11025; // 11kHz mono keeps file size around 700KB for 64 seconds

// ==========================================
// 1. BACKSOUND LOOPS (64.0 seconds duration)
// ==========================================

// A. Tema Terang: Upbeat major scale (Angklung/Bamboo style arpeggios)
const backsoundTerang = createWavBuffer(LOOP_DURATION, SAMPLE_RATE, (t) => {
  const noteLen = 0.5; // 120 BPM
  const currentNoteIdx = Math.floor(t / noteLen);
  let sample = 0;
  
  // Sum current note and last 2 notes for polyphony
  for (let offset = 0; offset <= 2; offset++) {
    const idx = currentNoteIdx - offset;
    if (idx < 0) continue;
    const noteStart = idx * noteLen;
    const elapsed = t - noteStart;
    if (elapsed < 0 || elapsed > 1.2) continue; // note has decayed
    
    // Chord progression C -> F -> G -> C (changes every 8 beats/4 seconds)
    const chordIdx = Math.floor(idx / 8) % 4;
    const noteInChord = idx % 4;
    
    let freq = 261.63;
    if (chordIdx === 0) { // C Major: C4, E4, G4, C5
      const chord = [261.63, 329.63, 392.00, 523.25];
      freq = chord[noteInChord];
    } else if (chordIdx === 1) { // F Major: F4, A4, C5, F5
      const chord = [349.23, 440.00, 523.25, 698.46];
      freq = chord[noteInChord];
    } else if (chordIdx === 2) { // G Major: G4, B4, D5, G5
      const chord = [293.66, 392.00, 493.88, 587.33];
      freq = chord[noteInChord];
    } else { // C Major Var: E4, G4, C5, E5
      const chord = [329.63, 392.00, 523.25, 659.25];
      freq = chord[noteInChord];
    }
    
    // Bamboo hollow pluck envelope
    const decay = Math.exp(-8.0 * elapsed);
    const tone = (Math.sin(2 * Math.PI * freq * elapsed) + 0.22 * Math.sin(2 * Math.PI * freq * 3.01 * elapsed)) * decay;
    sample += tone * 0.15;
  }
  
  // Soft crossfade-like fade boundary (200ms)
  let fade = 1.0;
  if (t < 0.2) fade = t / 0.2;
  else if (t > LOOP_DURATION - 0.2) fade = (LOOP_DURATION - t) / 0.2;
  
  return sample * fade;
});
saveWav('backsound_terang.wav', backsoundTerang);

// B. Tema Gelap: Ambient, slow soothing pentatonic drone (Calm & Elegant)
const backsoundGelap = createWavBuffer(LOOP_DURATION, SAMPLE_RATE, (t) => {
  // Slow base drone (changes every 16 seconds)
  const baseChordIdx = Math.floor(t / 16.0) % 4;
  const baseFreqs = [98.00, 130.81, 146.83, 98.00]; // G2, C3, D3, G2
  const droneFreq = baseFreqs[baseChordIdx];
  
  // Drone base synth
  let drone = (Math.sin(2 * Math.PI * droneFreq * t) + 0.35 * Math.sin(2 * Math.PI * droneFreq * 1.5 * t)) * 0.12;
  
  // Bell melody drop (every 2.0s)
  const noteLen = 2.0;
  const currentNoteIdx = Math.floor(t / noteLen);
  let bell = 0;
  
  for (let offset = 0; offset <= 3; offset++) {
    const idx = currentNoteIdx - offset;
    if (idx < 0) continue;
    const noteStart = idx * noteLen;
    const elapsed = t - noteStart;
    if (elapsed < 0 || elapsed > 6.0) continue; 
    
    const melody = [293.66, 329.63, 392.00, 440.00, 493.88, 587.33, 659.25, 783.99]; // G pentatonic
    const noteVal = melody[(idx * 3 + 2) % melody.length];
    
    const decay = Math.exp(-1.4 * elapsed);
    const tone = Math.sin(2 * Math.PI * noteVal * elapsed) * decay * 0.08;
    bell += tone;
  }
  
  const sample = drone + bell;
  
  let fade = 1.0;
  if (t < 0.3) fade = t / 0.3;
  else if (t > LOOP_DURATION - 0.3) fade = (LOOP_DURATION - t) / 0.3;
  
  return sample * fade;
});
saveWav('backsound_gelap.wav', backsoundGelap);

// C. Tema Retro: 8-bit chiptune with pentatonic arpeggios (Retro Indonesian chiptune)
const backsoundRetro = createWavBuffer(LOOP_DURATION, SAMPLE_RATE, (t) => {
  const stepLen = 1 / 3; // 3 steps per second
  const currentStep = Math.floor(t / stepLen);
  let sample = 0;
  
  // Lead square wave synth arpeggio
  for (let offset = 0; offset <= 1; offset++) {
    const idx = currentStep - offset;
    if (idx < 0) continue;
    const noteStart = idx * stepLen;
    const elapsed = t - noteStart;
    if (elapsed < 0 || elapsed > 0.6) continue;
    
    const melody = [
      329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 293.66,
      329.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 523.25
    ];
    const freq = melody[idx % melody.length];
    
    const decay = Math.max(0, 1 - elapsed * 4.5);
    const val = Math.sign(Math.sin(2 * Math.PI * freq * elapsed)) * decay * 0.06;
    sample += val;
  }
  
  // Background Arpeggiator (12 steps per second)
  const arpLen = 1 / 12;
  const arpStep = Math.floor(t / arpLen);
  const arpBaseFreqs = [164.81, 196.00, 220.00, 261.63]; 
  const chordIdx = Math.floor(arpStep / 16) % 4;
  const baseFreq = arpBaseFreqs[chordIdx];
  const arpFreq = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 1.8][arpStep % 4];
  
  const arpElapsed = t - arpStep * arpLen;
  const arpDecay = Math.max(0, 1 - arpElapsed * 10);
  const arpVal = (Math.abs(((arpElapsed * arpFreq) % 1) - 0.5) - 0.25) * 4 * arpDecay * 0.03;
  sample += arpVal;
  
  let fade = 1.0;
  if (t < 0.2) fade = t / 0.2;
  else if (t > LOOP_DURATION - 0.2) fade = (LOOP_DURATION - t) / 0.2;
  
  return sample * fade;
});
saveWav('backsound_retro.wav', backsoundRetro);

// D. Tema Nusantara: Gamelan Slendro (Saron bronze keys + deep backing gongs)
const backsoundNusantara = createWavBuffer(LOOP_DURATION, SAMPLE_RATE, (t) => {
  const noteLen = 0.6; // ~100 BPM
  const currentNoteIdx = Math.floor(t / noteLen);
  let sample = 0;
  
  // Metallic ringing bronze saron synth
  for (let offset = 0; offset <= 3; offset++) {
    const idx = currentNoteIdx - offset;
    if (idx < 0) continue;
    const noteStart = idx * noteLen;
    const elapsed = t - noteStart;
    if (elapsed < 0 || elapsed > 1.8) continue;
    
    const melody = [
      261.63, 293.66, 329.63, 392.00, 440.00, 392.00, 329.63, 293.66,
      329.63, 392.00, 440.00, 523.25, 440.00, 392.00, 329.63, 261.63
    ];
    const freq = melody[idx % melody.length];
    
    const decay = Math.exp(-3.5 * elapsed);
    const tone = (
      Math.sin(2 * Math.PI * freq * elapsed) * 0.5 + 
      Math.sin(2 * Math.PI * freq * 2.01 * elapsed) * 0.25 + 
      Math.sin(2 * Math.PI * freq * 3.03 * elapsed) * 0.1
    ) * decay;
    
    sample += tone * 0.15;
  }
  
  // Deep gong every 4.8s (at beat 0 of 8-beat bar)
  const gongLen = noteLen * 8;
  const gongIdx = Math.floor(t / gongLen);
  const gongStart = gongIdx * gongLen;
  const gongElapsed = t - gongStart;
  if (gongElapsed >= 0 && gongElapsed < 4.0) {
    const gongDecay = Math.exp(-1.2 * gongElapsed);
    const gongTone = Math.sin(2 * Math.PI * 65.41 * gongElapsed) * gongDecay * 0.16; // C2 deep backing gong
    sample += gongTone;
  }
  
  let fade = 1.0;
  if (t < 0.2) fade = t / 0.2;
  else if (t > LOOP_DURATION - 0.2) fade = (LOOP_DURATION - t) / 0.2;
  
  return sample * fade;
});
saveWav('backsound_nusantara.wav', backsoundNusantara);

// E. Tema Bahari: Ambient ocean waves + soft wooden xylophone (Gambang)
const backsoundBahari = createWavBuffer(LOOP_DURATION, SAMPLE_RATE, (t) => {
  // Modulated ocean noise (waves: 8-second cycle)
  const waveAmp = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t / 8.0));
  const noise = (Math.random() * 2 - 1) * 0.012 * waveAmp;
  
  // Wooden pluck gambang notes (2.5 notes per second)
  const noteLen = 0.4;
  const currentNoteIdx = Math.floor(t / noteLen);
  let xylophone = 0;
  
  for (let offset = 0; offset <= 2; offset++) {
    const idx = currentNoteIdx - offset;
    if (idx < 0) continue;
    const noteStart = idx * noteLen;
    const elapsed = t - noteStart;
    if (elapsed < 0 || elapsed > 0.8) continue;
    
    const melody = [
      311.13, 349.23, 415.30, 523.25, 415.30, 349.23, 311.13, 277.18,
      311.13, 415.30, 523.25, 622.25, 523.25, 415.30, 349.23, 311.13
    ];
    const freq = melody[idx % melody.length];
    
    const decay = Math.exp(-6.5 * elapsed);
    const tone = Math.sin(2 * Math.PI * freq * elapsed) * decay * 0.08;
    xylophone += tone;
  }
  
  const sample = noise + xylophone;
  
  let fade = 1.0;
  if (t < 0.2) fade = t / 0.2;
  else if (t > LOOP_DURATION - 0.2) fade = (LOOP_DURATION - t) / 0.2;
  
  return sample * fade;
});
saveWav('backsound_bahari.wav', backsoundBahari);

// F. Tema Pasar Malam: Festive rhythm + warm glowing bells
const backsoundPasarMalam = createWavBuffer(LOOP_DURATION, SAMPLE_RATE, (t) => {
  // Low drum (Kendhang) simulation (sliding pitch bends)
  const beatLen = 0.25; // 240 BPM
  const currentBeat = Math.floor(t / beatLen);
  let drums = 0;
  
  const isDrumHit = (currentBeat % 4 === 0 || currentBeat % 4 === 2 || currentBeat % 8 === 7);
  if (isDrumHit) {
    const beatStart = currentBeat * beatLen;
    const elapsed = t - beatStart;
    if (elapsed >= 0 && elapsed < 0.25) {
      const freq = 90 - 40 * (elapsed / 0.25);
      const drumDecay = Math.exp(-18.0 * elapsed);
      drums = Math.sin(2 * Math.PI * freq * elapsed) * drumDecay * 0.09;
    }
  }
  
  // Festive bells melody (1.5 notes per second)
  const bellLen = 0.5;
  const currentBellIdx = Math.floor(t / bellLen);
  let bells = 0;
  
  for (let offset = 0; offset <= 2; offset++) {
    const idx = currentBellIdx - offset;
    if (idx < 0) continue;
    const noteStart = idx * bellLen;
    const elapsed = t - noteStart;
    if (elapsed < 0 || elapsed > 1.0) continue;
    
    const melody = [
      392.00, 523.25, 587.33, 659.25, 587.33, 523.25, 659.25, 783.99,
      659.25, 587.33, 523.25, 392.00, 440.00, 523.25, 392.00, 329.63
    ];
    const freq = melody[idx % melody.length];
    
    const decay = Math.exp(-4.5 * elapsed);
    const tone = Math.sin(2 * Math.PI * freq * elapsed) * decay * 0.05;
    bells += tone;
  }
  
  const sample = drums + bells;
  
  let fade = 1.0;
  if (t < 0.2) fade = t / 0.2;
  else if (t > LOOP_DURATION - 0.2) fade = (LOOP_DURATION - t) / 0.2;
  
  return sample * fade;
});
saveWav('backsound_pasarmalam.wav', backsoundPasarMalam);

// ==========================================
// 2. SOUND EFFECTS (SFX)
// ==========================================

// A. Dice Roll: Rattling sound (0.5s)
const diceWav = createWavBuffer(0.5, SAMPLE_RATE, (t) => {
  const noise = Math.random() * 2 - 1;
  const rattle = 0.5 + 0.5 * Math.sin(2 * Math.PI * 40 * t);
  const decay = Math.max(0, 1 - t / 0.5);
  return noise * rattle * decay * 0.4;
});
saveWav('dice.wav', diceWav);

// B. Correct Answer: Uplifting chime (0.8s)
const correctWav = createWavBuffer(0.8, SAMPLE_RATE, (t) => {
  let val = 0;
  if (t < 0.4) {
    const decay = Math.exp(-6.0 * t);
    val += Math.sin(2 * Math.PI * 523.25 * t) * decay;
  }
  if (t >= 0.15) {
    const elapsed = t - 0.15;
    const decay = Math.exp(-6.0 * elapsed);
    val += Math.sin(2 * Math.PI * 659.25 * elapsed) * decay;
  }
  if (t >= 0.3) {
    const elapsed = t - 0.3;
    const decay = Math.exp(-6.0 * elapsed);
    val += Math.sin(2 * Math.PI * 783.99 * elapsed) * decay;
  }
  return val * 0.45;
});
saveWav('correct.wav', correctWav);

// C. Incorrect Answer: Low buzz (0.8s)
const incorrectWav = createWavBuffer(0.8, SAMPLE_RATE, (t) => {
  const decay = Math.max(0, 1 - t / 0.8);
  const freq = 130 - 50 * (t / 0.8);
  const val = Math.sign(Math.sin(2 * Math.PI * freq * t)) * 0.25 + (2 * ((t * freq) % 1) - 1) * 0.15;
  return val * decay * 0.35;
});
saveWav('incorrect.wav', incorrectWav);

// D. Ladder SFX: Fast rising chime glissando (1.0s)
const ladderWav = createWavBuffer(1.0, SAMPLE_RATE, (t) => {
  const decay = Math.max(0, 1 - t / 1.0);
  const freq = 300 + 900 * (t / 1.0); // slide from 300Hz to 1200Hz
  const val = Math.sin(2 * Math.PI * freq * t);
  const chime = Math.sin(2 * Math.PI * freq * 2.01 * t) * 0.3;
  return (val + chime) * decay * 0.25;
});
saveWav('ladder.wav', ladderWav);

// E. Snake SFX: Descending slide bubble hiss (1.2s)
const snakeWav = createWavBuffer(1.2, SAMPLE_RATE, (t) => {
  const decay = Math.max(0, 1 - t / 1.2);
  const freq = 800 - 650 * (t / 1.2); // slide from 800Hz to 150Hz
  const tone = Math.sin(2 * Math.PI * freq * t) * 0.5;
  const noise = (Math.random() * 2 - 1) * 0.25 * Math.sin(2 * Math.PI * 25 * t);
  return (tone + noise) * decay * 0.25;
});
saveWav('snake.wav', snakeWav);

// F. Win Fanfare: Joyful tune (2.0s)
const winWav = createWavBuffer(2.0, SAMPLE_RATE, (t) => {
  const melody = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
  const noteLen = 0.2;
  let val = 0;
  for (let i = 0; i < 8; i++) {
    const noteStart = i * noteLen;
    if (t >= noteStart) {
      const elapsed = t - noteStart;
      const freq = melody[i];
      const decay = Math.exp(-4.0 * elapsed);
      val += (Math.sin(2 * Math.PI * freq * elapsed) + 0.5 * Math.sin(2 * Math.PI * freq * 2 * elapsed)) * decay * 0.5;
    }
  }
  if (t >= 1.4) {
    const elapsed = t - 1.4;
    const decay = Math.exp(-2.0 * elapsed);
    val += (
      Math.sin(2 * Math.PI * 523.25 * elapsed) +
      Math.sin(2 * Math.PI * 659.25 * elapsed) +
      Math.sin(2 * Math.PI * 783.99 * elapsed) +
      Math.sin(2 * Math.PI * 1046.50 * elapsed)
    ) * decay * 0.35;
  }
  return val * 0.35;
});
saveWav('win.wav', winWav);
