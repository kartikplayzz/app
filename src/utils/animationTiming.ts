export const TIMING = {
  keyPressDown:      { duration: 40,       easing: 'ease-in' },
  keyRelease:        { duration: 120,      easing: 'cubic-bezier(0.34,1.56,0.64,1)' },   // spring
  charColorChange:   { duration: 80,       easing: 'ease' },
  cursorMove:        { duration: 80,       easing: 'cubic-bezier(0.2,0,0,1)' },
  cursorBlink:       { duration: 530,      easing: 'ease-in-out' },
  wordFlash:         { duration: 400,      easing: 'ease' },
  wpmCounter:        { duration: 400,      easing: 'ease-out' },
  errorShake:        { duration: 200,      easing: 'linear' },
  edgeFlash:         { duration: 280,      easing: 'ease' },
  xpPopup:           { duration: 800,      easing: 'ease-out' },
  streakBadgePulse:  { duration: 300,      easing: 'cubic-bezier(0.34,1.56,0.64,1)' },
  progressBarFill:   { duration: 300,      easing: 'cubic-bezier(0.4,0,0.2,1)' },
  accuracyRing:      { duration: 600,      easing: 'cubic-bezier(0.4,0,0.2,1)' },
  modeTransitionOut: { duration: 150,      easing: 'ease' },
  modeTransitionIn:  { duration: 200,      easing: 'ease' },
  resultsStagger:    { gap: 80,            easing: 'cubic-bezier(0.4,0,0.2,1)' },
  levelUpParticles:  { duration: 600,      easing: 'ease-out' },
  textLoadStagger:   { perChar: 12, each: 120, easing: 'ease' },  // cap total at 600ms
  themeSwitch:       { duration: 400,      easing: 'ease' },
};
