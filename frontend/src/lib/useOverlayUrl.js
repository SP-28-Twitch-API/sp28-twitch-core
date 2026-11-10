import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useStreamStyle } from './streamStyles';

// the obs browser source url, with the chosen stream style in it
export function useOverlayUrl() {
  const { style } = useStreamStyle();
  const [token, setToken] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api().getOverlay().then((r) => setToken(r.overlayToken)).catch(setError);
  }, []);

  const regenerate = useCallback(async () => {
    const r = await api().regenerateOverlay();
    setToken(r.overlayToken);
    return r.overlayToken;
  }, []);

  const url = token ? `${window.location.origin}/overlay/${token}?style=${style}` : '';
  return { url, token, error, regenerate };
}