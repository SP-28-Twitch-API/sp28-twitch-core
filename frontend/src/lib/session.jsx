import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, isDemo } from '../api';
import { useRouter } from '../router';

const SessionContext = createContext(null);

// loads the logged in channel once for every page inside the app shell
// no login --> login page and twitch access removed --> login page with a plain message (srs 3.1.7)
export function SessionProvider({ children }) {
  const { navigate } = useRouter();
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);

  const sendToLogin = useCallback((err) => {
    const reason = err?.code === 'REAUTH_REQUIRED' ? '?reason=expired' : '';
    navigate(`/login${reason}`, { replace: true });
  }, [navigate]);

  const load = useCallback(async () => {
    setError(null);
    try {
      setMe(await api().getMe());
    } catch (err) {
      if (err.status === 401) sendToLogin(err);
      else setError(err);
    }
  }, [sendToLogin]);

  useEffect(() => { load(); }, [load]);

  return (
    <SessionContext.Provider value={{ me, error, reload: load, demo: isDemo(), sendToLogin }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);