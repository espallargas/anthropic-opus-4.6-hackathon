import { AdminPage } from '@/components/AdminPage';
import { Chat } from '@/components/Chat';
import { Navbar } from '@/components/Navbar';
import { SetupForm } from '@/components/SetupForm';
import { Sidebar } from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCable } from './hooks/useCable';
import { useChatStore } from './hooks/useChatStore';
import { healthCheck } from './lib/api';
import type { SystemVars } from './lib/chatStore';
import { I18nProvider } from './lib/i18n';
import { AgentMockControls } from '@/components/AgentMockControls';

function App() {
  const location = useLocation();
  const [health, setHealth] = useState<string | null>(null);
  const [healthRtt, setHealthRtt] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const { status, roundTripMs } = useCable();
  const store = useChatStore();
  const isAdmin = location.pathname === '/admin';

  useEffect(() => {
    const startMs = Date.now();
    healthCheck()
      .then((data) => {
        const rtt = Date.now() - startMs;
        setHealth(data.status);
        setHealthRtt(rtt);
      })
      .catch(() => {
        const rtt = Date.now() - startMs;
        setHealth('error');
        setHealthRtt(rtt);
      });
  }, []);

  const handleSetup = (vars: SystemVars) => {
    store.createChat(vars);
    setShowSetup(false);
  };

  const handleNewChat = () => {
    setShowSetup(true);
  };

  const handleSelectChat = (id: string) => {
    store.selectChat(id);
    setShowSetup(false);
  };

  const showingSetup = showSetup || !store.activeChat;

  return (
    <I18nProvider>
      <div className="flex h-screen w-full flex-col bg-black text-white">
        <Navbar />
        <div className="flex min-h-0 flex-1">
          {isAdmin ? (
            <AdminPage />
          ) : (
            <>
              <Sidebar
                chats={store.chats}
                activeChatId={store.activeChatId}
                onSelectChat={handleSelectChat}
                onNewChat={handleNewChat}
                onDeleteChat={store.deleteChat}
                status={{
                  health,
                  healthRtt,
                  wsStatus: status,
                  wsRoundTripMs: roundTripMs,
                }}
              />

              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                  {showingSetup ? (
                    <SetupForm onSubmit={handleSetup} />
                  ) : (
                    <Chat chat={store.activeChat!} onUpdateMessages={store.updateMessages} />
                  )}
                </div>
              </div>

              <AgentMockControls />
            </>
          )}
        </div>
      </div>
    </I18nProvider>
  );
}

export default App;
