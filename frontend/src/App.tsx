import { AdminPage } from '@/components/AdminPage';
import { Chat } from '@/components/Chat';
import { Navbar } from '@/components/Navbar';
import { SetupForm } from '@/components/SetupForm';
import { Sidebar } from '@/components/Sidebar';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useChatStore } from './hooks/useChatStore';
import type { SystemVars } from './lib/chatStore';
import { I18nProvider } from './lib/i18n';
import { AgentMockControls } from '@/components/AgentMockControls';

function App() {
  const location = useLocation();
  const [showSetup, setShowSetup] = useState(false);
  const store = useChatStore();
  const isAdmin = location.pathname === '/admin';

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
