import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  Map, 
  User, 
  Home
} from 'lucide-react';
import MindmapApp from './components/Mindmap/MindmapApp';
import ChatP2PApp from './components/ChatP2P/ChatP2PApp';

type ModuleType = 'mindmap' | 'chat';

function App() {
  const [activeModule, setActiveModule] = useState<ModuleType>('mindmap');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const getModuleLabel = (type: ModuleType) => {
    switch (type) {
      case 'mindmap':
        return 'Mindmap Editor';
      case 'chat':
        return 'P2P WebRTC Chat';
      default:
        return '';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside 
        className="app-sidebar" 
        style={{ width: sidebarCollapsed ? '64px' : '260px' }}
      >
        <div className="sidebar-header">
          {!sidebarCollapsed ? (
            <div className="brand-wrapper">
              <div className="brand-icon">S</div>
              <span>SUNHOUSE</span>
            </div>
          ) : (
            <div className="brand-icon" style={{ margin: '0 auto' }}>S</div>
          )}
          
          <button 
            type="button" 
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Sidebar Navigation Menu Items */}
        <div className="sidebar-menu">
          <button
            type="button"
            className={`sidebar-menu-item ${activeModule === 'mindmap' ? 'active' : ''}`}
            onClick={() => setActiveModule('mindmap')}
          >
            <Map size={18} className="menu-icon" />
            {!sidebarCollapsed && <span className="menu-label">Mindmap</span>}
          </button>
          
          <button
            type="button"
            className={`sidebar-menu-item ${activeModule === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveModule('chat')}
          >
            <MessageSquare size={18} className="menu-icon" />
            {!sidebarCollapsed && <span className="menu-label">Chat P2P</span>}
          </button>
        </div>

        {/* Sidebar Footer User Info */}
        <div className="sidebar-footer">
          <div className="user-avatar">
            <User size={16} />
            <div className="status-indicator" />
          </div>
          {!sidebarCollapsed && (
            <div className="user-info">
              <span className="user-name">Nguyễn Văn A</span>
              <span className="user-role">Administrator</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-content">
        {/* Top Navbar Header */}
        <header className="app-header">
          <div className="header-left">
            {/* Dynamic Breadcrumbs */}
            <div className="breadcrumb-container" aria-label="breadcrumb">
              <div className="breadcrumb-item">
                <Home size={14} style={{ marginRight: '4px' }} />
                <span>Home</span>
              </div>
              <div className="breadcrumb-separator">/</div>
              <div className="breadcrumb-item active">
                <span>{getModuleLabel(activeModule)}</span>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noreferrer" 
              className="sidebar-toggle-btn"
              style={{ padding: '8px' }}
            >
              <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="18" width="18" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                <path d="M9 18c-4.51 2-5-2-7-2"></path>
              </svg>
            </a>
          </div>
        </header>

        {/* Workspace views */}
        <div className="workspace-container">
          {activeModule === 'mindmap' ? (
            <MindmapApp />
          ) : (
            <ChatP2PApp />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
