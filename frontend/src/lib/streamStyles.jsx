import { createContext, useContext, useEffect, useState } from 'react';

// every "stream style" the streamer can pick, 
// the look of each one lives in styles/themes.css

export const STREAM_STYLES = [
  {
    id: 'pulse',
    name: 'Pulse',
    vibe: 'Variety and just chatting',
    description: 'Dark, Twitch purple, alerts arrive with a heartbeat.',
    swatch: ['#0e0b16', '#9147ff', '#ff4f9a']
  },
  {
    id: 'arcade',
    name: 'Neon Arcade',
    vibe: 'FPS, esports, speedruns',
    description: 'Black glass, cyan and magenta glow, glitchy entrances.',
    swatch: ['#05060a', '#00e5ff', '#ff2bd6']
  },
  {
    id: 'cozy',
    name: 'Cozy Café',
    vibe: 'Art, cozy games, music',
    description: 'Warm paper tones, soft corners, alerts pop like bubbles.',
    swatch: ['#f6efe4', '#c26a3d', '#6d8b5b']
  },
  {
    id: 'terminal',
    name: 'Retro Terminal',
    vibe: 'Coding, retro, horror',
    description: 'Green on black, monospace, alerts type themselves out.',
    swatch: ['#020702', '#39ff6a', '#ffb000']
  },
  {
    id: 'studio',
    name: 'Clean Studio',
    vibe: 'IRL, podcasts, talk shows',
    description: 'Light and minimal, one accent color, calm motion.',
    swatch: ['#f7f7f8', '#1f6feb', '#111318']
  }
];

const STORAGE_KEY = 'sp28.style';
export const DEFAULT_STYLE = 'pulse';
export const isStyle = (id) => STREAM_STYLES.some((s) => s.id === id);

const StyleContext = createContext(null);

// remembers the streamer's choice in this browser and puts it on <html data-style="...">
// obs overlay gets  style from the ?style= part of its url instead)
export function StyleProvider({ children, forced }) {
  const [style, setStyle] = useState(() => {
    if (forced && isStyle(forced)) return forced;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return isStyle(saved) ? saved : DEFAULT_STYLE;
    } catch {
      return DEFAULT_STYLE;
    }
  });

  useEffect(() => {
    document.documentElement.dataset.style = style;
    if (forced) return;
    try { localStorage.setItem(STORAGE_KEY, style); } catch { /* private window */ }
  }, [style, forced]);

  return <StyleContext.Provider value={{ style, setStyle }}>{children}</StyleContext.Provider>;
}

export const useStreamStyle = () => useContext(StyleContext);
export const getStyleInfo = (id) => STREAM_STYLES.find((s) => s.id === id) || STREAM_STYLES[0];