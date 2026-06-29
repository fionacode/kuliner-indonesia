// Refactored AudioSystem to support Web Audio API for gapless looping, theme cross-fades, and synthesised UI SFX.

class AudioSystem {
  constructor() {
    this.muted = false;
    this.volume = 0.5; // Default volume at 50%
    this.isMusicPlaying = false;
    this.currentTheme = 'terang'; // Default theme

    // Web Audio API properties
    this.audioCtx = null;
    this.musicSourceNode = null;
    this.musicGainNode = null;

    // Cache of loaded AudioBuffers
    this.buffersCache = {};
    // Active load promises to prevent duplicate fetches
    this.loadingThemes = {};
  }

  getAudioContext() {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Preload a theme audio file and return the buffer
  async preloadTheme(theme) {
    if (this.buffersCache[theme]) return this.buffersCache[theme];
    if (this.loadingThemes[theme]) return this.loadingThemes[theme];

    const ctx = this.getAudioContext();
    if (!ctx) return null;

    const url = `/audio/backsound_${theme}.wav`;

    const loadPromise = (async () => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        // Use modern promise-based decodeAudioData if available, otherwise wrap
        let decoded;
        if (typeof ctx.decodeAudioData.prototype === 'undefined') {
          decoded = await ctx.decodeAudioData(arrayBuffer);
        } else {
          decoded = await new Promise((resolve, reject) => {
            ctx.decodeAudioData(arrayBuffer, resolve, reject);
          });
        }
        this.buffersCache[theme] = decoded;
        return decoded;
      } catch (err) {
        console.warn(`Failed to preload audio theme ${theme}:`, err);
        return null;
      } finally {
        delete this.loadingThemes[theme];
      }
    })();

    this.loadingThemes[theme] = loadPromise;
    return loadPromise;
  }

  init(theme = 'terang') {
    if (typeof window === 'undefined') return;
    this.currentTheme = theme;
    // Start preloading the current theme immediately
    this.preloadTheme(theme);
  }

  // Set the active theme, and transition background music with fade in/out
  async changeTheme(newTheme) {
    if (this.currentTheme === newTheme && (this.musicSourceNode || this.loadingThemes[newTheme])) return;

    const wasPlaying = this.isMusicPlaying;
    this.currentTheme = newTheme;

    // Fade out and stop the old theme music
    this.stopMusicWithFade(500);

    // Preload the new theme's buffer
    const buffer = await this.preloadTheme(newTheme);

    // If the theme was changed again while loading, abort playing this one
    if (this.currentTheme !== newTheme) return;

    if (wasPlaying && buffer && !this.muted) {
      this.playMusic(500); // Fade in over 500ms
    }
  }

  playMusic(fadeInDuration = 500) {
    if (typeof window === 'undefined') return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.isMusicPlaying = true;

    if (this.muted) return;

    // If already playing, stop the current node first to prevent overlaps
    if (this.musicSourceNode) {
      try {
        this.musicSourceNode.stop();
      } catch (e) {}
      this.musicSourceNode = null;
    }

    const buffer = this.buffersCache[this.currentTheme];
    if (!buffer) {
      // Not preloaded yet, trigger load and play when ready
      this.preloadTheme(this.currentTheme).then(buf => {
        if (buf && this.isMusicPlaying && !this.muted && this.currentTheme === this.currentTheme) {
          this.playMusic(fadeInDuration);
        }
      });
      return;
    }

    try {
      this.musicSourceNode = ctx.createBufferSource();
      this.musicSourceNode.buffer = buffer;
      this.musicSourceNode.loop = true;

      this.musicGainNode = ctx.createGain();

      this.musicSourceNode.connect(this.musicGainNode);
      this.musicGainNode.connect(ctx.destination);

      const targetVolume = this.volume * 0.45;

      const now = ctx.currentTime;
      if (fadeInDuration > 0) {
        this.musicGainNode.gain.setValueAtTime(0, now);
        this.musicGainNode.gain.linearRampToValueAtTime(targetVolume, now + (fadeInDuration / 1000));
      } else {
        this.musicGainNode.gain.setValueAtTime(targetVolume, now);
      }

      this.musicSourceNode.start(0);
    } catch (e) {
      console.warn("Failed to play background music:", e);
    }
  }

  stopMusicWithFade(fadeOutDuration = 500) {
    const nodeToStop = this.musicSourceNode;
    const gainToFade = this.musicGainNode;
    const ctx = this.getAudioContext();

    if (nodeToStop && gainToFade && ctx) {
      try {
        const now = ctx.currentTime;
        const currentVal = gainToFade.gain.value;
        gainToFade.gain.setValueAtTime(currentVal, now);
        gainToFade.gain.linearRampToValueAtTime(0, now + (fadeOutDuration / 1000));

        setTimeout(() => {
          try {
            nodeToStop.stop();
          } catch (e) {}
        }, fadeOutDuration + 50);
      } catch (e) {
        try {
          nodeToStop.stop();
        } catch (err) {}
      }
    } else if (nodeToStop) {
      try {
        nodeToStop.stop();
      } catch (e) {}
    }

    // Clear active music properties immediately so new plays don't collide
    if (this.musicSourceNode === nodeToStop) {
      this.musicSourceNode = null;
    }
    if (this.musicGainNode === gainToFade) {
      this.musicGainNode = null;
    }
  }

  stopMusic() {
    this.isMusicPlaying = false;
    this.stopMusicWithFade(200);
  }

  toggleMusic() {
    if (this.isMusicPlaying) {
      this.stopMusic();
    } else {
      this.playMusic(500);
    }
    return this.isMusicPlaying;
  }

  playSFX(type) {
    if (typeof window === 'undefined' || this.muted) return;

    // Check if it's a dynamic UI synthesised sound
    const synthSFX = ['select_players', 'select_character', 'select_answer', 'hover_option', 'correct', 'incorrect', 'step'];
    if (synthSFX.includes(type)) {
      this.playUISynthSFX(type);
      return;
    }

    try {
      let src = '';
      let sfxVolModifier = 1.0;

      switch (type) {
        case 'dice':
          src = '/audio/dice.wav';
          sfxVolModifier = 0.35; // Softened dice shake sound
          break;
        case 'ladder':
          src = '/audio/ladder.wav';
          sfxVolModifier = 1.1;
          break;
        case 'snake':
          src = '/audio/snake.wav';
          sfxVolModifier = 1.1;
          break;
        case 'win':
          src = '/audio/win.wav';
          sfxVolModifier = 1.3;
          break;
        default:
          return;
      }

      const sfx = new Audio(src);
      sfx.volume = this.muted ? 0 : this.volume * sfxVolModifier * 0.7; // scaled down to sound comfortable
      sfx.play().catch(e => {
        console.log("SFX autoplay blocked:", e);
      });
    } catch (e) {
      console.warn("Failed to play SFX:", e);
    }
  }

  // Synthesise customized playful UI SFX based on the current theme
  playUISynthSFX(type) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    // Create gain node for overall UI SFX volume control
    const sfxGain = ctx.createGain();
    const baseVolume = this.volume * 0.25; // Soft volume balanced with music
    sfxGain.gain.setValueAtTime(baseVolume, ctx.currentTime);
    sfxGain.connect(ctx.destination);

    const theme = this.currentTheme;
    const now = ctx.currentTime;

    // Helper to generate a quick burst of white noise for steps/percussion
    const playNoiseBurst = (duration, filterType, filterFreq, gainVal) => {
      try {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filterNode = ctx.createBiquadFilter();
        filterNode.type = filterType;
        filterNode.frequency.setValueAtTime(filterFreq, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(gainVal, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        noise.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(sfxGain);

        noise.start(now);
        noise.stop(now + duration);
      } catch (err) {}
    };

    if (theme === 'terang') {
      // Ceria, Ringan, Pop casual, Nada hangat dan menyenangkan
      if (type === 'select_players') {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.07);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'select_character') {
        const notes = [392.00, 523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.4, now + idx * 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.12);

          osc.connect(gainNode);
          gainNode.connect(sfxGain);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.12);
        });
      } else if (type === 'select_answer') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.08);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'hover_option') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.02);
      } else if (type === 'correct') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.4, now + idx * 0.06);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.22);

          osc.connect(gainNode);
          gainNode.connect(sfxGain);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.22);
        });
      } else if (type === 'incorrect') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(392.00, now);
        osc.frequency.linearRampToValueAtTime(261.63, now + 0.25);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'step') {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(380, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } else if (theme === 'gelap') {
      // Futuristik ringan, Sedikit elektronik, Tetap lembut dan nyaman
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(700, now);
      filter.connect(sfxGain);

      if (type === 'select_players') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.setValueAtTime(440, now + 0.06);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.45, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gainNode);
        gainNode.connect(filter);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'select_character') {
        const notes = [174.61, 261.63, 349.23];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.07);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.35, now + idx * 0.07);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.07 + 0.16);

          osc.connect(gainNode);
          gainNode.connect(filter);
          osc.start(now + idx * 0.07);
          osc.stop(now + idx * 0.07 + 0.16);
        });
      } else if (type === 'select_answer') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.08);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);

        osc.connect(gainNode);
        gainNode.connect(filter);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'hover_option') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        osc.connect(gainNode);
        gainNode.connect(filter);
        osc.start(now);
        osc.stop(now + 0.02);
      } else if (type === 'correct') {
        const notes = [440.00, 659.25, 880.00];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.4, now + idx * 0.06);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.06 + 0.3);

          osc.connect(gainNode);
          gainNode.connect(filter);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.3);
        });
      } else if (type === 'incorrect') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(147, now + 0.22);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gainNode);
        gainNode.connect(filter);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'step') {
        playNoiseBurst(0.015, 'lowpass', 400, 0.2);
      }
    } else if (theme === 'retro') {
      // Gaya arcade 8-bit, Pixel game klasik, Nuansa retro gaming
      if (type === 'select_players') {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(330, now);
        osc.frequency.setValueAtTime(660, now + 0.04);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.setValueAtTime(0, now + 0.08);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'select_character') {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.2, now + idx * 0.04);
          gainNode.gain.setValueAtTime(0, now + idx * 0.04 + 0.04);

          osc.connect(gainNode);
          gainNode.connect(sfxGain);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.04);
        });
      } else if (type === 'select_answer') {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(783.99, now);
        osc.frequency.setValueAtTime(987.77, now + 0.04);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.setValueAtTime(0, now + 0.08);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'hover_option') {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1100, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.setValueAtTime(0, now + 0.015);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.015);
      } else if (type === 'correct') {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.22, now + idx * 0.04);
          gainNode.gain.setValueAtTime(0, now + idx * 0.04 + 0.04);

          osc.connect(gainNode);
          gainNode.connect(sfxGain);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.04);
        });
      } else if (type === 'incorrect') {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(70, now + 0.25);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'step') {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(170, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.setValueAtTime(0, now + 0.012);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.012);
      }
    } else if (theme === 'nusantara') {
      // Sentuhan alat musik tradisional Indonesia (Angklung/Gamelan/Perkusi)
      if (type === 'select_players') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        osc2.frequency.setValueAtTime(783.99, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.25);
        osc2.stop(now + 0.25);
      } else if (type === 'select_character') {
        const notes = [659.25, 880.00];
        [0, 0.05, 0.10].forEach((delay) => {
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = 'sine';
          osc2.type = 'sine';
          osc1.frequency.setValueAtTime(notes[0], now + delay);
          osc2.frequency.setValueAtTime(notes[1], now + delay);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.35, now + delay);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.08);

          osc1.connect(gainNode);
          gainNode.connect(sfxGain);

          osc1.start(now + delay);
          osc2.start(now + delay);
          osc1.stop(now + delay + 0.08);
          osc2.stop(now + delay + 0.08);
        });
      } else if (type === 'select_answer') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, now);
        osc2.frequency.setValueAtTime(880.00, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.2);
        osc2.stop(now + 0.2);
      } else if (type === 'hover_option') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.02);
      } else if (type === 'correct') {
        const notes = [523.25, 587.33, 698.46, 783.99, 880.00];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.4, now + idx * 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.25);

          osc.connect(gainNode);
          gainNode.connect(sfxGain);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.25);
        });
      } else if (type === 'incorrect') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(130.81, now);
        osc2.frequency.setValueAtTime(196.00, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.55, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
      } else if (type === 'step') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.18, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.018);
      }
    } else if (theme === 'bahari') {
      // Nuansa laut, Efek air atau gelembung halus
      if (type === 'select_players') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.08);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'select_character') {
        [0, 0.06].forEach((delay, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(200 + idx * 50, now + delay);
          osc.frequency.exponentialRampToValueAtTime(600 + idx * 50, now + delay + 0.06);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.45, now + delay);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.08);

          osc.connect(gainNode);
          gainNode.connect(sfxGain);
          osc.start(now + delay);
          osc.stop(now + delay + 0.08);
        });
      } else if (type === 'select_answer') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.07);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.45, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'hover_option') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.01);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.12, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.012);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.012);
      } else if (type === 'correct') {
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.05);
          osc.frequency.exponentialRampToValueAtTime(freq * 3, now + idx * 0.05 + 0.06);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.4, now + idx * 0.05);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.05 + 0.07);

          osc.connect(gainNode);
          gainNode.connect(sfxGain);
          osc.start(now + idx * 0.05);
          osc.stop(now + idx * 0.05 + 0.07);
        });
      } else if (type === 'incorrect') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.22);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.24);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.24);
      } else if (type === 'step') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(1300, now + 0.015);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.18, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.015);
      }
    } else if (theme === 'pasarmalam') {
      // Nuansa festival malam, lonceng kecil, permainan rakyat
      if (type === 'select_players') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'select_character') {
        [0, 0.05].forEach((delay, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440 + idx * 100, now + delay);
          osc.frequency.exponentialRampToValueAtTime(880 + idx * 100, now + delay + 0.08);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.3, now + delay);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.1);

          osc.connect(gainNode);
          gainNode.connect(sfxGain);
          osc.start(now + delay);
          osc.stop(now + delay + 0.1);
        });
      } else if (type === 'select_answer') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(783.99, now);
        osc2.frequency.setValueAtTime(1046.50, now + 0.04);

        const gainNode1 = ctx.createGain();
        gainNode1.gain.setValueAtTime(0.35, now);
        gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

        const gainNode2 = ctx.createGain();
        gainNode2.gain.setValueAtTime(0.35, now + 0.04);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        osc1.connect(gainNode1);
        gainNode1.connect(sfxGain);
        osc2.connect(gainNode2);
        gainNode2.connect(sfxGain);

        osc1.start(now);
        osc2.start(now + 0.04);
        osc1.stop(now + 0.12);
        osc2.stop(now + 0.22);
      } else if (type === 'hover_option') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1500, now);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.015);
      } else if (type === 'correct') {
        const notes = [1046.50, 1318.51, 1567.98, 2093.00];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.04);

          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(0.38, now + idx * 0.04);
          gainNode.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.04 + 0.22);

          osc.connect(gainNode);
          gainNode.connect(sfxGain);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.22);
        });
      } else if (type === 'incorrect') {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880.00, now);
        osc.frequency.linearRampToValueAtTime(587.33, now + 0.25);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

        osc.connect(gainNode);
        gainNode.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'step') {
        playNoiseBurst(0.02, 'highpass', 4000, 0.15);
      }
    }
  }

  setVolume(newVolume) {
    this.volume = Math.max(0, Math.min(1, newVolume));
    this.updateVolume();
  }

  updateVolume() {
    const ctx = this.getAudioContext();
    if (this.musicGainNode && ctx) {
      const targetVolume = this.muted ? 0 : this.volume * 0.45;
      this.musicGainNode.gain.setValueAtTime(targetVolume, ctx.currentTime);
    }
  }

  setMute(isMuted) {
    this.muted = isMuted;
    this.updateVolume();

    if (isMuted) {
      this.stopMusicWithFade(200);
    } else {
      if (this.isMusicPlaying) {
        this.playMusic(300);
      }
    }
  }
}

const audioSystemInstance = new AudioSystem();
export default audioSystemInstance;
