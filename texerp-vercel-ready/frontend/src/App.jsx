import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layouts
import AppLayout from './components/layout/AppLayout';
import MainAdminLayout from './components/layout/MainAdminLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Public Pages
import Login from './pages/Login';

// Main Admin Portal Pages (Role 1: Main Admin)
import MainAdminDashboard from './pages/main-admin/MainAdminDashboard';
import ClientAccounts from './pages/main-admin/ClientAccounts';
import MainAdminSettings from './pages/main-admin/MainAdminSettings';

// Client Admin ERP Pages (Role 2: Admin)
import Dashboard from './pages/Dashboard';
import Items from './pages/Items';
import Inventory from './pages/Inventory';
import Purchases from './pages/Purchases';
import PrintingJobs from './pages/PrintingJobs';
import PrintingReceipts from './pages/PrintingReceipts';
import Production from './pages/Production';
import FinishedProducts from './pages/FinishedProducts';
import SalesOrders from './pages/SalesOrders';
import Deliveries from './pages/Deliveries';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import ProfitLoss from './pages/ProfitLoss';
import Reports from './pages/Reports';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import CompanySettings from './pages/CompanySettings';
import AuditLogs from './pages/AuditLogs';

// Role-based Root Redirector Component
function RoleRootRedirect() {
  const { user } = useAuth();
  if (user?.role_name === 'Main Admin') {
    return <Navigate to="/main-admin" replace />;
  }
  return <Dashboard />;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Auth Route */}
            <Route path="/login" element={<Login />} />

            {/* 1. MASTER MAIN ADMIN PORTAL (ROLE 1) */}
            <Route element={<ProtectedRoute allowedRoles={['Main Admin']} />}>
              <Route element={<MainAdminLayout />}>
                <Route path="/main-admin" element={<MainAdminDashboard />} />
                <Route path="/main-admin/companies" element={<ClientAccounts />} />
                <Route path="/main-admin/settings" element={<MainAdminSettings />} />
                <Route path="/main-admin/audit-logs" element={<AuditLogs />} />
              </Route>
            </Route>

            {/* 2. CLIENT ADMIN ERP PORTAL (ROLE 2) */}
            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<RoleRootRedirect />} />
                <Route path="/items" element={<Items />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/printing" element={<PrintingJobs />} />
                <Route path="/printing-receipts" element={<PrintingReceipts />} />
                <Route path="/production" element={<Production />} />
                <Route path="/finished-products" element={<FinishedProducts />} />
                <Route path="/sales" element={<SalesOrders />} />
                <Route path="/deliveries" element={<Deliveries />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/profit-loss" element={<ProfitLoss />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/company-settings" element={<CompanySettings />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
