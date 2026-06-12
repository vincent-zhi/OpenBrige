import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/Layout';
import { Inbox } from './pages/Inbox';
import { SessionDetail } from './pages/SessionDetail';
import { Profiles } from './pages/Profiles';
import { ConnectionDoctor } from './pages/ConnectionDoctor';
import { wsClient } from './lib/ws';
import { useSessionStore } from './stores/session';

export default function App() {
  const setWsState = useSessionStore((s) => s.setWsState);

  useEffect(() => {
    wsClient.onStateChange = setWsState;
    wsClient.connect('/ws');
    return () => wsClient.disconnect();
  }, [setWsState]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inbox />} />
        <Route path="sessions/:id" element={<SessionDetail />} />
        <Route path="profiles" element={<Profiles />} />
        <Route path="connection" element={<ConnectionDoctor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
