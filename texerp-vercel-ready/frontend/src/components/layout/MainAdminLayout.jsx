import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import MainAdminSidebar from './MainAdminSidebar';
import Topbar from './Topbar';
import CreateAccountModal from '../../pages/main-admin/CreateAccountModal';

export default function MainAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Main Admin Sidebar */}
      <MainAdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenCreateModal={() => setCreateModalOpen(true)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ refreshTrigger, openCreateModal: () => setCreateModalOpen(true) }} />
        </main>
      </div>

      {/* Global Create Account Modal */}
      {createModalOpen && (
        <CreateAccountModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={() => {
            setCreateModalOpen(false);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
