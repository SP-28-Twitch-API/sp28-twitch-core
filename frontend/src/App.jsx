import { useEffect } from 'react';
import { RouterProvider, useRouter } from './router';
import { StyleProvider, isStyle } from './lib/streamStyles';
import { SessionProvider } from './lib/session';
import AppShell from './components/AppShell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Setup from './pages/Setup';
import Settings from './pages/Settings';
import Overlay from './pages/Overlay';

const PAGES = { '/dashboard': Dashboard, '/alerts': Alerts, '/setup': Setup, '/settings': Settings };

function Redirect({ to }) {
  const { navigate } = useRouter();
  useEffect(() => { navigate(to, { replace: true }); }, [navigate, to]);
  return null;
}

function Routes() {
  const { path, query } = useRouter();

  // the obs overlay: bare page, style comes from its url (obs has its own browser storage)
  if (path.startsWith('/overlay/')) {
    const style = query.get('style');
    return (
      <StyleProvider forced={isStyle(style) ? style : 'pulse'}>
        <Overlay token={path.slice('/overlay/'.length)} />
      </StyleProvider>
    );
  }

  return (
    <StyleProvider>
      {path === '/login' ? <Login /> : PAGES[path] ? (
        <SessionProvider>
          <AppShell>{(() => { const Page = PAGES[path]; return <Page />; })()}</AppShell>
        </SessionProvider>
      ) : <Redirect to="/dashboard" />}
    </StyleProvider>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <Routes />
    </RouterProvider>
  );
}