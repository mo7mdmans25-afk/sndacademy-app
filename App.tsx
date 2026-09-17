/**
 * SANAD ACADEMY PLATFORM — FINAL VERSION (1.0)
 * Main Application Shell & Unified Router
 * بنية موحدة نظيفة ومستقرة دون فوضى التفرعات
 */

import { lazy, Suspense, useState, useEffect } from 'react';
import { auth } from '@/services/auth';
import { db } from '@/services/database';
import { SessionUser } from '@/types';
import { Navbar } from '@/components/Navbar';
import { PublicWebsite } from '@/components/PublicWebsite';
import { LoginPage } from '@/components/LoginPage';
const AdminDashboard = lazy(() => import('@/components/AdminDashboard').then((module) => ({ default: module.AdminDashboard })));
const TeacherDashboard = lazy(() => import('@/components/TeacherDashboard').then((module) => ({ default: module.TeacherDashboard })));
const StudentPortal = lazy(() => import('@/components/StudentPortal').then((module) => ({ default: module.StudentPortal })));
const ParentPortal = lazy(() => import('@/components/ParentPortal').then((module) => ({ default: module.ParentPortal })));
const AffiliatePortal = lazy(() => import('@/components/AffiliatePortal').then((module) => ({ default: module.AffiliatePortal })));
const VerifyDocumentModal = lazy(() => import('@/components/VerifyDocumentModal').then((module) => ({ default: module.VerifyDocumentModal })));
const ChatMessengerModal = lazy(() => import('@/components/ChatMessengerModal').then((module) => ({ default: module.ChatMessengerModal })));
const ResourceLibraryView = lazy(() => import('@/components/ResourceLibraryView').then((module) => ({ default: module.ResourceLibraryView })));
import { notificationService } from '@/services/notificationService';
import { MessageSquare, Bell, X } from 'lucide-react';
import { bootstrapCloudBridge } from '@/services/cloudBridge';

export default function App() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [currentRoute, setCurrentRoute] = useState<string>('/');
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyDocId, setVerifyDocId] = useState('');
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatDefaultTab, setChatDefaultTab] = useState<'chat' | 'announcements'>('chat');
  const [activeToasts, setActiveToasts] = useState<any[]>([]);

  // تشغيل جسر التخزين السحابي (جوجل شيتس) مرة واحدة عند الإقلاع.
  // إن لم يُضبط رابط جوجل شيت بعد، يعمل التطبيق من ذاكرة المتصفح المحلية.
  useEffect(() => {
    void bootstrapCloudBridge();
  }, []);

  // Synchronize authentication on mount & subscribe to toasts
  useEffect(() => {
    const user = auth.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }

    const unsubscribe = notificationService.subscribeToToasts((toast) => {
      setActiveToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setActiveToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);
    });

    // Check URL parameters for direct verification links or deep-links
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const verifyParam = urlParams.get('verify');
      if (verifyParam) {
        setVerifyDocId(verifyParam);
        setVerifyModalOpen(true);
      }

      // Check hash route if any
      const hash = window.location.hash.replace('#', '');
      if (hash && ['admin', 'teacher', 'student', 'parent', 'affiliate', 'login', 'resources'].includes(hash)) {
        setCurrentRoute('/' + hash);
      }
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const handleNavigate = (route: string) => {
    // If navigating to a protected route without being logged in, redirect to login
    if (route !== '/' && route !== '/login') {
      const active = auth.getCurrentUser();
      if (!active) {
        setCurrentRoute('/login');
        if (typeof window !== 'undefined') window.location.hash = 'login';
        return;
      }
    }

    setCurrentRoute(route);
    if (typeof window !== 'undefined') {
      window.location.hash = route === '/' ? '' : route.replace('/', '');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (user: SessionUser, homeUrl: string) => {
    setCurrentUser(user);
    handleNavigate(homeUrl);
  };

  const handleOpenVerifyWithId = (id: string) => {
    setVerifyDocId(id);
    setVerifyModalOpen(true);
  };

  // Render Role-Guarded Views
  const renderMainContent = () => {
    // Public Website
    if (currentRoute === '/') {
      return (
        <PublicWebsite
          onNavigateLogin={() => handleNavigate('/login')}
          onOpenVerify={() => {
            setVerifyDocId('');
            setVerifyModalOpen(true);
          }}
        />
      );
    }

    // Login Page
    if (currentRoute === '/login') {
      return (
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          onNavigateHome={() => handleNavigate('/')}
        />
      );
    }

    // Protected Route: Admin
    if (currentRoute === '/admin') {
      if (!currentUser || currentUser.role !== 'ADMIN') {
        return (
          <div className="p-12 text-center text-sm font-bold text-red-700">
            غير مصرح لك بالوصول إلى لوحة الإدارة. يرجى تسجيل الدخول بحساب المدير.
          </div>
        );
      }
      return (
        <AdminDashboard
          currentUser={currentUser}
          onOpenVerifyWithId={handleOpenVerifyWithId}
        />
      );
    }

    // Protected Route: Teacher
    if (currentRoute === '/teacher') {
      if (!currentUser || currentUser.role !== 'TEACHER') {
        return (
          <div className="p-12 text-center text-sm font-bold text-red-700">
            غير مصرح لك بالوصول إلى لوحة المعلمة. يرجى تسجيل الدخول بحساب معلمة.
          </div>
        );
      }
      return <TeacherDashboard currentUser={currentUser} />;
    }

    // Protected Route: Student
    if (currentRoute === '/student') {
      if (!currentUser || currentUser.role !== 'STUDENT') {
        return (
          <div className="p-12 text-center text-sm font-bold text-red-700">
            غير مصرح لك بالوصول إلى بوابة الطالب. يرجى تسجيل الدخول بحساب طالب.
          </div>
        );
      }
      return (
        <StudentPortal
          currentUser={currentUser}
          onOpenVerifyWithId={handleOpenVerifyWithId}
        />
      );
    }

    // Protected Route: Parent
    if (currentRoute === '/parent') {
      if (!currentUser || currentUser.role !== 'PARENT') {
        return (
          <div className="p-12 text-center text-sm font-bold text-red-700">
            غير مصرح لك بالوصول إلى بوابة ولي الأمر. يرجى تسجيل الدخول بحساب ولي أمر.
          </div>
        );
      }
      return (
        <ParentPortal
          currentUser={currentUser}
          onOpenVerifyWithId={handleOpenVerifyWithId}
        />
      );
    }

    // Protected Route: Affiliate
    if (currentRoute === '/affiliate') {
      if (!currentUser || currentUser.role !== 'AFFILIATE') {
        return (
          <div className="p-12 text-center text-sm font-bold text-red-700">
            غير مصرح لك بالوصول إلى بوابة المسوق. يرجى تسجيل الدخول بحساب شريك تسويقي.
          </div>
        );
      }
      return <AffiliatePortal currentUser={currentUser} />;
    }

    // Resource Library Route (Accessible by all or logged in)
    if (currentRoute === '/resources') {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ResourceLibraryView
            currentUser={currentUser || { id: 'GUEST', username: 'guest', role: 'STUDENT', refId: 'GUEST', status: 'نشط', displayName: 'زائر الأكاديمية' }}
            onBack={() => handleNavigate(currentUser ? (currentUser.role === 'ADMIN' ? '/admin' : currentUser.role === 'TEACHER' ? '/teacher' : currentUser.role === 'STUDENT' ? '/student' : '/') : '/')}
          />
        </div>
      );
    }

    // Fallback
    return (
      <PublicWebsite
        onNavigateLogin={() => handleNavigate('/login')}
        onOpenVerify={() => {
          setVerifyDocId('');
          setVerifyModalOpen(true);
        }}
      />
    );
  };

  // make sure to consider if you need authentication for certain routes
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F0] font-sans antialiased text-right" dir="rtl">
      
      {/* Global Brand Navbar */}
      <Navbar
        currentUser={currentUser}
        onNavigate={handleNavigate}
        onOpenVerify={() => {
          setVerifyDocId('');
          setVerifyModalOpen(true);
        }}
        onOpenChat={() => {
          setChatDefaultTab('chat');
          setChatModalOpen(true);
        }}
        currentRoute={currentRoute}
      />

      {/* Main View Router */}
      <main className="flex-1">
        <Suspense fallback={<PageLoadingFallback />}>
          {renderMainContent()}
        </Suspense>
      </main>

      {/* Standalone Document Verification Modal */}
      <VerifyDocumentModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        initialId={verifyDocId}
      />

      {/* Unified Chat & Messaging Modal */}
      {currentUser && (
        <ChatMessengerModal
          isOpen={chatModalOpen}
          onClose={() => setChatModalOpen(false)}
          currentUser={currentUser}
          defaultTab={chatDefaultTab}
        />
      )}

      {/* Floating Chat & Messages Launcher Button */}
      {currentUser && (
        <button
          onClick={() => {
            setChatDefaultTab('chat');
            setChatModalOpen(true);
          }}
          className="fixed bottom-6 left-6 z-40 px-4 py-3 bg-gradient-to-r from-[#0B3B2E] to-[#124B3B] text-white rounded-full shadow-2xl hover:scale-105 transition-all duration-200 border-2 border-[#C9A227] flex items-center gap-2.5 cursor-pointer group"
          id="floating-chat-btn"
          title="فتح المراسلات والشات الداخلي"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5 text-[#C9A227]" />
            {db.getUnreadMessagesCount(currentUser.refId || currentUser.username) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
            )}
          </div>
          <span className="font-bold text-xs">الشات والمراسلات</span>
        </button>
      )}

      {/* Floating Live Toast Notifications Stack */}
      {activeToasts.length > 0 && (
        <div className="fixed top-20 left-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none" dir="rtl">
          {activeToasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto bg-[#0B3B2E] text-white p-4 rounded-2xl shadow-2xl border border-[#C9A227] flex items-start gap-3 animate-in slide-in-from-top duration-300"
            >
              <div className="w-8 h-8 rounded-xl bg-[#C9A227] text-[#0B3B2E] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-xs text-[#FAF7F0]">{toast.title}</div>
                <div className="text-[11px] text-[#E8D9A6] mt-0.5 leading-relaxed">{toast.message}</div>
                {toast.actionLabel && (
                  <button
                    onClick={() => {
                      toast.onAction?.();
                      setActiveToasts((prev) => prev.filter((t) => t.id !== toast.id));
                    }}
                    className="mt-2 text-[11px] bg-[#C9A227] text-[#0B3B2E] font-bold px-3 py-1 rounded-lg hover:bg-[#b8911f] transition cursor-pointer"
                  >
                    {toast.actionLabel}
                  </button>
                )}
              </div>
              <button
                onClick={() => setActiveToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-white/60 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

function PageLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-6" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center gap-4 text-[#0B3B2E]">
        <div className="h-10 w-10 rounded-full border-4 border-[#C9A227]/25 border-t-[#C9A227] animate-spin" />
        <p className="text-sm font-bold">جارٍ تحميل مساحة الأكاديمية…</p>
      </div>
    </div>
  );
}
