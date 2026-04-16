let ctx: AudioContext | null = null;

export function playTimerBeep(): void {
  try {
    if (!ctx) {
      const Ctor =
        typeof window !== "undefined"
          ? window.AudioContext ??
            (window as unknown as { webkitAudioContext?: typeof AudioContext })
              .webkitAudioContext
          : undefined;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.setValueAtTime(0.15, now + 0.25);
    gain.gain.linearRampToValueAtTime(0, now + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    /* autoplay blocked / jsdom / ancient browser — silent swallow */
  }
}
