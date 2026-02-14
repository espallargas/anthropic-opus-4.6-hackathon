import { AdminPage } from '@/components/AdminPage';
import { Chat } from '@/components/Chat';
import { SetupForm } from '@/components/SetupForm';
import { Sidebar } from '@/components/Sidebar';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCable } from './hooks/useCable';
import { useChatStore } from './hooks/useChatStore';
import { healthCheck } from './lib/api';
import type { SystemVars } from './lib/chatStore';
import { I18nProvider } from './lib/i18n';
// import { Globe } from '@/components/Globe'
import { AgentMockControls } from '@/components/AgentMockControls';

function App() {
  const location = useLocation();
  const [health, setHealth] = useState<string | null>(null);
  const [healthRtt, setHealthRtt] = useState<number | null>(null);
  const [showSetup, setShowSetup] = useState(false);
  const { status, roundTripMs } = useCable();
  const store = useChatStore();

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

  if (location.pathname === '/admin') {
    return (
      <I18nProvider>
        <AdminPage />
      </I18nProvider>
    );
  }

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

  // const origin = store.activeChat?.systemVars.origin_country ?? ''
  // const destination = store.activeChat?.systemVars.destination_country ?? ''

  return (
    <I18nProvider>
      <div className="flex h-screen w-full bg-black text-white">
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

        {/* Right panel - globe background + content overlay */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* <div className="absolute inset-0 z-0 opacity-80">
            <Globe origin={origin} destination={destination} className="h-full w-full" />
          </div> */}

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            {showingSetup ? (
              <SetupForm onSubmit={handleSetup} />
            ) : (
              <Chat chat={store.activeChat!} onUpdateMessages={store.updateMessages} />
            )}
          </div>
        </div>

        <AgentMockControls />
      </div>
    </I18nProvider>
  );
}

export default App;
