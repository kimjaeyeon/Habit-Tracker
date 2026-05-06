import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let completeSound: Audio.Sound | null = null;
let celebrationSound: Audio.Sound | null = null;

export async function playComplete() {
  try {
    if (Platform.OS === 'web') {
      playWebTone([523.25, 659.25], 0.25);
      return;
    }
    if (!completeSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/complete.wav')
      );
      completeSound = sound;
    }
    await completeSound.setPositionAsync(0);
    await completeSound.playAsync();
  } catch {}
}

export async function playCelebration() {
  try {
    if (Platform.OS === 'web') {
      playWebArpeggio();
      return;
    }
    if (!celebrationSound) {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/celebration.wav')
      );
      celebrationSound = sound;
    }
    await celebrationSound.setPositionAsync(0);
    await celebrationSound.playAsync();
  } catch {}
}

function playWebTone(frequencies: number[], duration: number) {
  if (typeof AudioContext === 'undefined') return;
  const ctx = new AudioContext();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  for (const freq of frequencies) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
  setTimeout(() => ctx.close(), duration * 1000 + 100);
}

function playWebArpeggio() {
  if (typeof AudioContext === 'undefined') return;
  const ctx = new AudioContext();
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.08 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.08);
    osc.stop(ctx.currentTime + i * 0.08 + 0.5);
  });
  setTimeout(() => ctx.close(), 1000);
}
