import React from 'react';
import { LOGO_BASE64 } from '../constants';
import type { User } from '../types';

type Tab = 'dashboard' | 'spreadsheet' | 'kanban' | 'calendar' | 'history' | 'admin' | 'archived';

interface SidebarProps {
  currentUser: User;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onLogout: () => void;
}

const NavLink: React.FC<{
  tabId: Tab;
  label: string;
  icon: React.ReactNode;
  activeTab: Tab;
  onClick: () => void;
}> = ({ tabId, label, icon, activeTab, onClick }) => (
  <a
    href="#"
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      activeTab === tabId
        ? 'bg-indigo-600 text-white'
        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
    }`}
  >
    {icon}
    <span className="ml-3">{label}</span>
  </a>
);

const Sidebar: React.FC<SidebarProps> = ({ currentUser, activeTab, setActiveTab, onLogout }) => {
  return (
    <div className="flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm h-screen sticky top-0">
      <div className="flex items-center justify-center p-4 border-b border-gray-200 h-20">
        <img src={LOGO_BASE64} alt="Logo" className="h-12 w-auto" />
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {currentUser.permission === 'adm' && (
          <NavLink
            tabId="dashboard"
            label="Dashboard Geral"
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
            activeTab={activeTab}
            onClick={() => setActiveTab('dashboard')}
          />
        )}
        <NavLink
          tabId="spreadsheet"
          label="My Cases"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
          activeTab={activeTab}
          onClick={() => setActiveTab('spreadsheet')}
        />
        <NavLink
          tabId="kanban"
          label="Kanban"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>}
          activeTab={activeTab}
          onClick={() => setActiveTab('kanban')}
        />
        <NavLink
          tabId="calendar"
          label="Calendário"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          activeTab={activeTab}
          onClick={() => setActiveTab('calendar')}
        />
        <NavLink
          tabId="history"
          label="Histórico"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          activeTab={activeTab}
          onClick={() => setActiveTab('history')}
        />
        {currentUser.permission === 'adm' && (
           <>
            <NavLink
                tabId="archived"
                label="Arquivados"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>}
                activeTab={activeTab}
                onClick={() => setActiveTab('archived')}
            />
            <NavLink
                tabId="admin"
                label="Administração"
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                activeTab={activeTab}
                onClick={() => setActiveTab('admin')}
            />
           </>
        )}
      </nav>
      <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  {currentUser.name.charAt(0)}
              </div>
              <div>
                 <p className="text-sm font-semibold text-gray-800">{currentUser.name}</p>
                 <p className="text-xs text-gray-500">{currentUser.email}</p>
              </div>
          </div>
        <button
          onClick={onLogout}
          className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-white transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>
          Sair
        </button>
      </div>
    </div>
  );
};

export default Sidebar;