import { AdminPage } from '@/components/AdminPage';
import { Chat } from '@/components/Chat';
import { DesignFab } from '@/components/DesignFab';
import { HomePage } from '@/components/HomePage';
import { Navbar } from '@/components/Navbar';
import { SetupForm } from '@/components/SetupForm';
import { Sidebar } from '@/components/Sidebar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useChatStore } from './hooks/useChatStore';
import type { ChatMessage, SystemVars } from './lib/chatStore';
import { getCountryNameLocalized } from './lib/countries';
import { useI18n } from './lib/i18n';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showSetup, setShowSetup] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const store = useChatStore();
  const isAdmin = location.pathname === '/admin';

  // Sync chat selection with URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id && store.chats.some((c) => c.id === id)) {
      store.selectChat(id);
      setShowSetup(false);
    } else if (location.pathname === '/' || location.pathname === '/chat') {
      if (!id) {
        store.selectChat(null);
        setShowSetup(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, searchParams]);

  const handleSetup = (vars: SystemVars) => {
    const natNames = vars.nationality
      .split(', ')
      .map((code) => getCountryNameLocalized(code, t))
      .join(', ');

    const objectiveLabel = vars.objective
      .split(', ')
      .map((k) => t(k))
      .join(', ');

    const greeting = [
      t('greeting.intro'),
      '',
      `- **${t('greeting.nationalities')}**: ${natNames}`,
      `- **${t('greeting.origin')}**: ${getCountryNameLocalized(vars.origin_country, t)}`,
      `- **${t('greeting.destination')}**: ${getCountryNameLocalized(vars.destination_country, t)}`,
      `- **${t('greeting.objective')}**: ${objectiveLabel}`,
      '',
      t('greeting.closing'),
    ].join('\n');

    const initialMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: greeting,
    };

    const chatId = store.createChat(vars, [initialMessage]);
    setShowSetup(false);
    navigate(`/chat?id=${chatId}`);
  };

  const handleNewChat = () => {
    setShowSetup(true);
  };

  const handleSelectChat = (id: string) => {
    store.selectChat(id);
    setShowSetup(false);
    navigate(`/chat?id=${id}`);
  };

  const handleGoHome = () => {
    store.selectChat(null);
    setShowSetup(false);
    navigate('/');
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
      const isRtl = document.documentElement.dir === 'rtl';
      const newWidth = isRtl ? rect.right - e.clientX : e.clientX - rect.left;

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

  const view = showSetup ? 'setup' : store.activeChat ? 'chat' : 'home';

  return (
    <div className="bg-background text-foreground flex h-screen w-full flex-col">
      <Navbar onMenuClick={() => setMobileSidebarOpen(true)} />
      <div ref={containerRef} className="flex min-h-0 flex-1">
        {isAdmin ? (
          <AdminPage />
        ) : (
          <>
            {/* Desktop sidebar */}
            <div
              className="relative hidden md:block"
              style={{ width: `${sidebarWidth}px`, flexShrink: 0 }}
            >
              <Sidebar
                chats={store.chats}
                activeChatId={store.activeChatId}
                onSelectChat={handleSelectChat}
                onNewChat={handleNewChat}
                onDeleteChat={store.deleteChat}
              />
              {/* Resize handle */}
              <div
                className="absolute end-0 top-0 h-full cursor-col-resize transition-all select-none"
                onMouseDown={handleMouseDown}
                style={{
                  userSelect: 'none',
                  width: '4px',
                  marginInlineEnd: '-2px',
                  background: 'transparent',
                }}
                title={t('resize.tooltip')}
              >
                <div
                  style={{
                    position: 'absolute',
                    insetInlineEnd: '1.5px',
                    top: 0,
                    height: '100%',
                    width: isResizing ? '1px' : '0.5px',
                    background: isResizing
                      ? 'rgba(255, 255, 255, 0.5)'
                      : 'rgba(255, 255, 255, 0.15)',
                    transition: 'all 200ms',
                  }}
                />
              </div>
            </div>

            {/* Mobile sidebar overlay */}
            {mobileSidebarOpen && (
              <div className="fixed inset-0 z-50 md:hidden">
                <div
                  className="absolute inset-0 bg-black/50"
                  onClick={() => setMobileSidebarOpen(false)}
                />
                <div className="relative h-full w-72">
                  <Sidebar
                    chats={store.chats}
                    activeChatId={store.activeChatId}
                    onSelectChat={handleSelectChat}
                    onNewChat={handleNewChat}
                    onDeleteChat={store.deleteChat}
                    onClose={() => setMobileSidebarOpen(false)}
                  />
                </div>
              </div>
            )}

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                {view === 'setup' && (
                  <SetupForm
                    onSubmit={handleSetup}
                    onCancel={store.activeChat ? () => setShowSetup(false) : handleGoHome}
                  />
                )}
                {view === 'chat' && (
                  <Chat chat={store.activeChat!} onUpdateMessages={store.updateMessages} />
                )}
                {view === 'home' && (
                  <HomePage
                    chats={store.chats}
                    onSelectChat={handleSelectChat}
                    onNewChat={handleNewChat}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <DesignFab />
    </div>
  );
}

export default App;
