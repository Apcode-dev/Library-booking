import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider } from './context/AuthContext';
import { isNativeApp } from './lib/platform';
import MobileAppShell from './mobile/MobileAppShell';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import HomePage from './pages/HomePage';
import LibraryDetailsPage from './pages/LibraryDetailsPage';
import MyBookingsPage from './pages/MyBookingsPage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ErrorBoundary from './components/common/ErrorBoundary';

export const App: React.FC = () => {
  const [isMobileMode, setIsMobileMode] = useState<boolean>(() => isNativeApp());

  useEffect(() => {
    setIsMobileMode(isNativeApp());

    let backHandler: any;
    try {
      backHandler = CapApp.addListener('backButton', ({ canGoBack }) => {
        if (window.location.pathname !== '/') {
          window.history.back();
        } else if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
    } catch {
      // Ignored if running on standard web browser
    }

    return () => {
      backHandler?.then?.((sub: any) => sub.remove());
    };
  }, []);

  return (
    <AuthProvider>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '16px',
            background: '#0f172a',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '600',
            padding: '12px 18px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
      {/* If running inside Native Android App shell or mobile preview mode, render dedicated Mobile Experience */}
      {isMobileMode ? (
        <MobileAppShell />
      ) : (
        /* Otherwise render the existing standard Web application */
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
            <Navbar />
            <main className="flex-1">
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/library/:idOrSlug" element={<LibraryDetailsPage />} />
                  <Route path="/my-bookings" element={<MyBookingsPage />} />
                  <Route path="/owner" element={<OwnerDashboardPage />} />
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route
                    path="*"
                    element={
                      <div className="max-w-md mx-auto my-24 p-8 bg-white rounded-3xl border border-slate-200/80 shadow-xl text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black shadow-inner">
                          404
                        </div>
                        <h2 className="text-xl font-extrabold text-slate-900">Page Not Found</h2>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          The page you are looking for does not exist or has been moved.
                        </p>
                        <Link
                          to="/"
                          className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-500/20"
                        >
                          <span>Return to Home</span>
                        </Link>
                      </div>
                    }
                  />
                </Routes>
              </ErrorBoundary>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      )}
    </AuthProvider>
  );
};

export default App;
