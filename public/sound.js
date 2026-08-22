// Web Audio API Sound Effects Engine
class SoundManager {
    constructor() {
        this.ctx = null;
        this.enabled = localStorage.getItem('sound_enabled') !== 'false';
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            // resume() rejects outside a user gesture (autoplay policy); the
            // context revives on the next real interaction, so swallow it.
            const resume = this.ctx.resume();
            if (resume && typeof resume.catch === 'function') {
                resume.catch(() => {});
            }
        }
    }

    toggleSound(enable) {
        this.enabled = enable !== undefined ? enable : !this.enabled;
        localStorage.setItem('sound_enabled', this.enabled ? 'true' : 'false');
        return this.enabled;
    }

    playCorrect() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    playWrong() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now); // A3
        osc.frequency.linearRampToValueAtTime(146.83, now + 0.25); // D3

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    playStreak() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = this.ctx.currentTime + i * 0.08;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + 0.25);
        });
    }

    playWin() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const fanfare = [
            { f: 523.25, d: 0.12 },
            { f: 659.25, d: 0.12 },
            { f: 783.99, d: 0.12 },
            { f: 1046.50, d: 0.35 }
        ];

        let timeOffset = 0;
        fanfare.forEach((n) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = this.ctx.currentTime + timeOffset;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(n.f, startTime);

            gain.gain.setValueAtTime(0.2, startTime);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + n.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + n.d);

            timeOffset += n.d * 0.85;
        });
    }

    playClick() {
        if (!this.enabled) return;
        this.init();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.03);
    }
}

export const sound = new SoundManager();
