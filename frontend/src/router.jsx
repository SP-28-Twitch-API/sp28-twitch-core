import { createContext, useCallback, useContext, useEffect, useState } from 'react';

//  app only has limited pages --> no extra library is needed
const RouterContext = createContext(null);

const readLocation = () => ({
  path: window.location.pathname,
  query: new URLSearchParams(window.location.search)
});

export function RouterProvider({ children }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const onBack = () => setLocation(readLocation());
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    window.history[replace ? 'replaceState' : 'pushState']({}, '', to);
    setLocation(readLocation());
    window.scrollTo(0, 0);
  }, []);

  return <RouterContext.Provider value={{ ...location, navigate }}>{children}</RouterContext.Provider>;
}

export const useRouter = () => useContext(RouterContext);

// a normal link that changes page without reloading (ctrl/cmd-click still opens a new tab)
export function Link({ to, children, ...rest }) {
  const { navigate } = useRouter();
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={to} onClick={onClick} {...rest}>{children}</a>;
}