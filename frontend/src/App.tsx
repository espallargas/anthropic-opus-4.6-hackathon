import { AdminPage } from '@/components/AdminPage';
import { Chat } from '@/components/Chat';
import { Navbar } from '@/components/Navbar';
import { SetupForm } from '@/components/SetupForm';
import { Sidebar } from '@/components/Sidebar';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useChatStore } from './hooks/useChatStore';
import type { SystemVars } from './lib/chatStore';
import { I18nProvider } from './lib/i18n';
import { AgentMockControls } from '@/components/AgentMockControls';

function App() {
  const location = useLocation();
  const [showSetup, setShowSetup] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280); // pixels
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - rect.left;

      // Constrain between 200px and 500px
      if (newWidth >= 200 && newWidth <= 500) {
        setSidebarWidth(newWidth);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const showingSetup = showSetup || !store.activeChat;

  return (
    <I18nProvider>
      <div className="flex h-screen w-full flex-col bg-black text-white">
        <Navbar />
        <div ref={containerRef} className="flex min-h-0 flex-1">
          {isAdmin ? (
            <AdminPage />
          ) : (
            <>
              <div style={{ width: `${sidebarWidth}px`, flexShrink: 0, position: 'relative' }}>
                <Sidebar
                  chats={store.chats}
                  activeChatId={store.activeChatId}
                  onSelectChat={handleSelectChat}
                  onNewChat={handleNewChat}
                  onDeleteChat={store.deleteChat}
                />
                {/* Resize handle - invisible hit area with visual feedback */}
                <div
                  className="absolute right-0 top-0 h-full cursor-col-resize select-none transition-all"
                  onMouseDown={handleMouseDown}
                  style={{
                    userSelect: 'none',
                    width: '6px',
                    marginRight: '-3px',
                    background: isResizing ? 'rgba(255, 255, 255, 0.4)' : 'transparent'
                  }}
                  title="Arraste para redimensionar"
                >
                  {/* Visual line - thin, only shows on hover/drag */}
                  <div
                    style={{
                      position: 'absolute',
                      right: '2.5px',
                      top: 0,
                      height: '100%',
                      width: isResizing ? '2px' : '1px',
                      background: isResizing ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.1)',
                      transition: 'all 200ms'
                    }}
                  />
                </div>
              </div>

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
