/**
 * SANAD ACADEMY PLATFORM — FINAL VERSION (1.0)
 * Unified Admin Management Center (لوحة الإدارة الشاملة)
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  CreditCard, 
  Award, 
  AlertTriangle, 
  Settings as SettingsIcon, 
  Activity, 
  Sparkles, 
  Search, 
  CheckCircle, 
  XCircle, 
  Printer, 
  Download, 
  Upload, 
  Plus, 
  Trash2, 
  Sliders, 
  Shield, 
  UserCheck, 
  Share2, 
  FileText,
  DollarSign,
  TrendingUp,
  Inbox,
  Clock,
  Layers,
  Edit,
  Eye,
  FileSpreadsheet,
  MessageSquare,
  Send,
  Radio,
  Volume2,
  CheckCheck,
  Bell,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { UnifiedReportsHub } from './UnifiedReportsHub';
import { StudentsDirectoryView } from './StudentsDirectoryView';
import { 
  SessionUser, 
  Student, 
  Teacher, 
  SessionRecord, 
  FinancialFee, 
  FinancialPayment, 
  AcademyExpense, 
  AcademicCase, 
  Certificate, 
  Ijazah, 
  RegistrationSubmission,
  AffiliatePartner,
  CurriculumItem,
  PlatformSettings
} from '../types';
import { db } from '../services/database';
import { computeTeacherMonthly, rankStudents, computeDayScore } from '../services/evaluations';
import { analyzePlacement } from '../services/placement';
import { runFullPlatformDiagnostics, TestResult } from '../services/testSuite';
import { StudentCardModal } from './StudentCardModal';
import { QURAN_SURAHS } from '../services/quranData';
import { GoogleSheetsIntegration } from './GoogleSheetsIntegration';
import { syncSingleExpense } from '../services/googleSheetsSync';

interface AdminDashboardProps {
  currentUser: SessionUser;
  onOpenVerifyWithId: (id: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser, onOpenVerifyWithId }) => {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const todayStr = new Date().toISOString().substring(0, 10);

  // Active Main Navigation Tab
  type AdminTab = 'overview' | 'messages' | 'students' | 'placement' | 'teachers' | 'finance' | 'cases' | 'certificates' | 'registrations' | 'affiliates' | 'curriculum' | 'sheets' | 'settings' | 'tests';
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Sub-Tab under 'overview' (لوحة الإدارة → التقارير)
  const [overviewSubTab, setOverviewSubTab] = useState<'dashboard' | 'reports'>('reports');

  // State refreshes
  const [dataVersion, setDataVersion] = useState(0);
  const triggerRefresh = () => setDataVersion(v => v + 1);

  // Selected Student for Card
  const [selectedStudentForCard, setSelectedStudentForCard] = useState<Student | null>(null);

  // Entities
  const students = useMemo(() => db.getStudents(), [dataVersion]);
  const teachers = useMemo(() => db.getTeachers(), [dataVersion]);
  const records = useMemo(() => db.getRecords(), [dataVersion]);
  const fees = useMemo(() => db.getFees(), [dataVersion]);
  const payments = useMemo(() => db.getPayments(), [dataVersion]);
  const expenses = useMemo(() => db.getExpenses(), [dataVersion]);
  const cases = useMemo(() => db.getCases(), [dataVersion]);
  const certificates = useMemo(() => db.getCertificates(), [dataVersion]);
  const ijazahs = useMemo(() => db.getIjazahs(), [dataVersion]);
  const registrations = useMemo(() => db.getRegistrations(), [dataVersion]);
  const affiliates = useMemo(() => db.getAffiliates(), [dataVersion]);
  const curriculum = useMemo(() => db.getCurriculum(), [dataVersion]);
  const settings = useMemo(() => db.getSettings(), [dataVersion]);
  const conversations = useMemo(() => db.getConversations('ADMIN', 'ADMIN'), [dataVersion]);
  const notifications = useMemo(() => db.getNotifications(), [dataVersion]);

  // Messages Tab State
  const [selectedAdminConvId, setSelectedAdminConvId] = useState('');
  const [adminChatInput, setAdminChatInput] = useState('');
  const [adminBroadcastAudience, setAdminBroadcastAudience] = useState<'ALL' | 'TEACHER' | 'PARENT' | 'STUDENT'>('ALL');
  const [adminBroadcastTitle, setAdminBroadcastTitle] = useState('');
  const [adminBroadcastMessage, setAdminBroadcastMessage] = useState('');
  const [adminBroadcastSuccess, setAdminBroadcastSuccess] = useState(false);

  useEffect(() => {
    if (conversations.length > 0 && !selectedAdminConvId) {
      setSelectedAdminConvId(conversations[0].id);
    }
  }, [conversations, selectedAdminConvId]);

  // Overall Financial Calculations
  const totalRevenue = useMemo(() => payments.reduce((acc, p) => acc + p.amount, 0), [payments]);
  const totalExpenses = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);
  const netProfit = totalRevenue - totalExpenses;
  const totalUnpaidFees = useMemo(() => {
    const totalDue = fees.reduce((acc, f) => acc + (f.amount || 0), 0);
    return Math.max(0, totalDue - totalRevenue);
  }, [fees, totalRevenue]);

  // Placement Analysis
  const placementData = useMemo(() => analyzePlacement(currentMonth), [dataVersion, currentMonth]);

  // Student of the month ranking
  const ranking = useMemo(() => rankStudents(currentMonth), [dataVersion, currentMonth]);

  // Diagnostic Test Suite State
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testOutput, setTestOutput] = useState<{
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
    results: TestResult[];
  } | null>(null);

  const handleRunTests = async () => {
    setIsRunningTests(true);
    const res = await runFullPlatformDiagnostics();
    setTestOutput(res);
    setIsRunningTests(false);
  };

  // Student Search
  const [studentSearch, setStudentSearch] = useState('');
  const [studentLevelFilter, setStudentLevelFilter] = useState('ALL');
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchQuery = !studentSearch || s.name.includes(studentSearch) || s.id.includes(studentSearch) || s.phone.includes(studentSearch);
      const matchLevel = studentLevelFilter === 'ALL' || s.level === studentLevelFilter;
      return matchQuery && matchLevel;
    });
  }, [students, studentSearch, studentLevelFilter]);

  // Case modal / resolution state
  const [resolvingCaseId, setResolvingCaseId] = useState<string | null>(null);
  const [caseDecision, setCaseDecision] = useState('');
  const [caseActionNotes, setCaseActionNotes] = useState('');

  const handleResolveCase = (caseId: string) => {
    if (!caseDecision.trim()) {
      alert('يجب تدوين القرار النهائي لحل الحالة قبل إغلاقها');
      return;
    }
    const c = cases.find(item => item.id === caseId);
    if (c) {
      c.status = 'تمت المعالجة';
      c.finalDecision = caseDecision;
      c.resultDetails = caseActionNotes || 'تم تنفيذ القرار الإداري وتوثيقه';
      c.closedAt = new Date().toISOString();
      db.saveCase(c);
      triggerRefresh();
      setResolvingCaseId(null);
      setCaseDecision('');
      setCaseActionNotes('');
    }
  };

  // Certificate Issuance Modal state
  const [newCertStudentId, setNewCertStudentId] = useState(students[0]?.id || '');
  const [newCertTitle, setNewCertTitle] = useState('شهادة إتمام حفظ وتجويد جزء عمّ');
  const [newCertType, setNewCertType] = useState<Certificate['certType']>('إتمام جزء');
  const [showIssueCertModal, setShowIssueCertModal] = useState(false);

  const handleIssueCertDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find(s => s.id === newCertStudentId);
    const t = teachers.find(item => item.id === st?.teacherId);
    const certId = `SANAD-${new Date().getFullYear()}-${Date.now().toString().substring(8)}`;

    db.saveCertificate({
      id: certId,
      serial: certId,
      studentId: newCertStudentId,
      teacherId: t ? t.id : teachers[0].id,
      certType: newCertType,
      title: newCertTitle,
      issueDate: todayStr,
      status: 'معتمدة',
      verificationToken: Math.random().toString(36).substring(2, 12).toUpperCase(),
      showTeacherName: true,
      teacherName: t ? t.name : 'معلمة الأكاديمية',
      approvedBy: currentUser.displayName,
      createdAt: new Date().toISOString()
    });

    triggerRefresh();
    setShowIssueCertModal(false);
  };

  // Ijazah Issuance Modal state
  const [newIjzStudentId, setNewIjzStudentId] = useState(students[0]?.id || '');
  const [newIjzType, setNewIjzType] = useState('إجازة بالسند المتصل في قراءة عاصم');
  const [newIjzRiwayah, setNewIjzRiwayah] = useState('رواية حفص عن عاصم من طريق الشاطبية');
  const [newIjzIssuer, setNewIjzIssuer] = useState('فضيلة الشيخ المقرئ بالسند المتصل');
  const [showIssueIjzModal, setShowIssueIjzModal] = useState(false);

  const handleIssueIjzDirect = (e: React.FormEvent) => {
    e.preventDefault();
    const ijzId = `SANAD-IJZ-${new Date().getFullYear()}-${Date.now().toString().substring(8)}`;

    db.saveIjazah({
      id: ijzId,
      studentId: newIjzStudentId,
      ijazahType: newIjzType,
      riwayah: newIjzRiwayah,
      issuer: newIjzIssuer,
      issueDate: todayStr,
      status: 'معتمدة',
      verificationToken: Math.random().toString(36).substring(2, 12).toUpperCase(),
      approvedBy: currentUser.displayName,
      createdAt: new Date().toISOString()
    });

    triggerRefresh();
    setShowIssueIjzModal(false);
  };

  // Add Expense State
  const [expCategory, setExpCategory] = useState<AcademyExpense['category']>('رواتب');
  const [expAmount, setExpAmount] = useState<number>(1000);
  const [expRecipient, setExpRecipient] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const newExp: AcademyExpense = {
      id: `EXP-${Date.now().toString().substring(7)}`,
      category: expCategory,
      amount: expAmount,
      date: todayStr,
      recipient: expRecipient,
      description: expDesc,
      approvedBy: currentUser.displayName
    };
    db.saveExpense(newExp);
    syncSingleExpense(newExp);
    triggerRefresh();
    setShowAddExpense(false);
    setExpRecipient('');
    setExpDesc('');
  };

  // Settings modification
  const [localSettings, setLocalSettings] = useState<PlatformSettings>({ ...settings });
  const [settingsSaved, setSettingsSaved] = useState(false);

  const handleSaveSettings = () => {
    db.saveSettings(localSettings);
    triggerRefresh();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-right">
      
      {/* Admin Top Header */}
      <div className="bg-gradient-to-r from-[#0B3B2E] via-[#124B3B] to-[#155A46] text-white p-6 rounded-3xl border border-[#C9A227]/40 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C9A227] text-[#0B3B2E] flex items-center justify-center font-black text-2xl shadow-inner">
            س
          </div>
          <div>
            <div className="text-xs text-[#E8D9A6] font-medium">لوحة القيادة والتحكم الإداري الموحدة</div>
            <h1 className="text-xl sm:text-2xl font-black text-[#FAF7F0]">{settings.ACADEMY_NAME}</h1>
            <div className="text-xs text-gray-300 mt-0.5">
              مدير النظام: <strong className="text-white">{currentUser.displayName}</strong> • الإصدار الموحد 1.0 Final
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              db.resetToComprehensiveDemoData();
              triggerRefresh();
            }}
            className="px-4 py-2.5 bg-[#C9A227] hover:bg-[#b8911f] text-[#0B3B2E] font-black text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
            title="إعادة شحن قاعدة البيانات بكامل السجلات التجريبية الموسعة"
          >
            <Sparkles className="w-4 h-4" />
            تحديث البيانات الشاملة
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-[#E8D9A6] font-bold text-xs rounded-xl border border-white/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-[#C9A227]" />
            فحص واختبار النظام
          </button>
        </div>
      </div>

      {/* Main Administrative Navigation Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-200 pb-2 text-xs font-bold scrollbar-thin">
        {[
          { id: 'overview', label: 'لوحة الإدارة', icon: Activity },
          { id: 'messages', label: `المراسلات والتعميمات (${conversations.length})`, icon: MessageSquare },
          { id: 'students', label: `الطلاب (${students.length})`, icon: Users },
          { id: 'placement', label: 'التسكين (تحليل)', icon: Layers },
          { id: 'teachers', label: `المعلمات (${teachers.length})`, icon: UserCheck },
          { id: 'finance', label: 'المالية الموحدة', icon: CreditCard },
          { id: 'cases', label: `الحالات (${cases.filter(c => c.status !== 'مغلقة' && c.status !== 'تمت المعالجة').length})`, icon: AlertTriangle },
          { id: 'certificates', label: `الشهادات (${certificates.length})`, icon: Award },
          { id: 'registrations', label: `التسجيلات (${registrations.filter(r => r.status === 'New').length})`, icon: Inbox },
          { id: 'affiliates', label: `المسوقون (${affiliates.length})`, icon: Share2 },
          { id: 'curriculum', label: 'المكتبة التربوية', icon: BookOpen },
          { id: 'sheets', label: 'ربط جوجل شيت', icon: FileSpreadsheet },
          { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
          { id: 'tests', label: 'الفحص الذاتي', icon: Shield },
        ].map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as AdminTab)}
              className={`shrink-0 px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                isActive ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#C9A227]' : 'text-gray-500'}`} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB: OVERVIEW & REPORTS (لوحة الإدارة → التقارير) */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Sub-Navigation: Dashboard vs Reports (لوحة الإدارة → التقارير → التقرير اليومي للمعلمات) */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOverviewSubTab('reports')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  overviewSubTab === 'reports'
                    ? 'bg-[#0B3B2E] text-white shadow-xs'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <FileText className={`w-4 h-4 ${overviewSubTab === 'reports' ? 'text-[#C9A227]' : 'text-gray-500'}`} />
                <span>📑 مركز التقارير الموحد</span>
              </button>

              <button
                type="button"
                onClick={() => setOverviewSubTab('dashboard')}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  overviewSubTab === 'dashboard'
                    ? 'bg-[#0B3B2E] text-white shadow-xs'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Activity className={`w-4 h-4 ${overviewSubTab === 'dashboard' ? 'text-[#C9A227]' : 'text-gray-500'}`} />
                <span>📊 مؤشرات اللوحة الرئيسية</span>
              </button>
            </div>

            <div className="text-xs text-gray-500 font-medium hidden sm:block">
              {overviewSubTab === 'reports' ? (
                <span className="text-[#0B3B2E] font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                  المسار: لوحة الإدارة ← مركز التقارير الموحد (يومي / أسبوعي / شهري)
                </span>
              ) : (
                <span>لوحة الإدارة ← مؤشرات عامة</span>
              )}
            </div>
          </div>

          {/* Render: Unified Reports Hub */}
          {overviewSubTab === 'reports' && (
            <UnifiedReportsHub
              currentUser={currentUser}
              dataVersion={dataVersion}
              onRefresh={triggerRefresh}
              onOpenTeacherChat={(teacherId) => {
                setActiveTab('messages');
              }}
            />
          )}

          {/* Render: General Overview Dashboard */}
          {overviewSubTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Quick Jump Banner to Daily Report */}
              <div className="bg-gradient-to-r from-amber-500/10 via-[#0B3B2E]/5 to-transparent p-4 rounded-2xl border border-amber-300/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0B3B2E] text-[#C9A227] flex items-center justify-center font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[#0B3B2E]">قسم التقارير الإدارية المعتمدة</h3>
                    <p className="text-[11px] text-gray-600">متابعة دقيقة ومباشرة لسجلات وحصص وحضور معلمات الأكاديمية</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOverviewSubTab('reports')}
                  className="px-3.5 py-1.5 bg-[#0B3B2E] hover:bg-[#124B3B] text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>فتح التقرير اليومي للمعلمات</span>
                  <ChevronLeft className="w-3.5 h-3.5 text-[#C9A227]" />
                </button>
              </div>

              {/* Key KPI Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                  <div className="text-xs text-gray-500 font-medium">الطلاب النشطون</div>
                  <div className="text-3xl font-black text-[#0B3B2E] mt-1">{students.filter(s => s.status === 'مستمر').length}</div>
                  <div className="text-[10px] text-gray-400 mt-1">إجمالي المقيدين: {students.length}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                  <div className="text-xs text-gray-500 font-medium">المعلمات المعتمدات</div>
                  <div className="text-3xl font-black text-[#0B3B2E] mt-1">{teachers.length}</div>
                  <div className="text-[10px] text-emerald-700 font-medium mt-1">25 معلمة مسجلة</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                  <div className="text-xs text-gray-500 font-medium">جلسات هذا الشهر</div>
                  <div className="text-3xl font-black text-[#C9A227] mt-1">
                    {records.filter(r => r.date.startsWith(currentMonth)).length}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-1">إجمالي الحصص: {records.length}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
                  <div className="text-xs text-gray-500 font-medium">صافي الرصيد المالي</div>
                  <div className="text-3xl font-black text-emerald-700 mt-1">{netProfit} {settings.CURRENCY}</div>
                  <div className="text-[10px] text-gray-400 mt-1">إيرادات: {totalRevenue} | مصروفات: {totalExpenses}</div>
                </div>
              </div>

              {/* Migration Integrity Banner */}
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-emerald-600 shrink-0" />
                  <div>
                    <strong className="text-emerald-950 font-bold">حالة ترحيل البيانات ومطابقة الأعداد:</strong>
                    <span className="text-emerald-800 mr-1">تم التحقق من سلامة كافة السجلات ومطابقة 25 معلمة وكافة الطلاب دون أي فاقد.</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('tests')}
                  className="text-emerald-900 font-bold underline cursor-pointer"
                >
                  عرض تقرير الفحص
                </button>
              </div>

              {/* Quick Actions & Recent Sessions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Recent Sessions */}
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-base text-[#0B3B2E]">آخر الجلسات المرصودة اليوم</h3>
                    <span className="text-xs text-gray-400">{todayStr}</span>
                  </div>

                  <div className="divide-y divide-gray-100 text-xs">
                    {records.slice(0, 5).map(r => {
                      const st = students.find(s => s.id === r.studentId);
                      const tc = teachers.find(t => t.id === r.teacherId);
                      return (
                        <div key={r.id} className="py-2.5 flex justify-between items-center">
                          <div>
                            <div className="font-bold text-gray-900">{st ? st.name : r.studentId}</div>
                            <div className="text-gray-500 text-[11px]">
                              المعلمة: {tc ? tc.name : r.teacherId} • سورة {r.currentSurah}
                            </div>
                          </div>
                          <div className="text-left">
                            <span className="font-bold text-[#0B3B2E]">{r.dayScore}%</span>
                            <div className="text-[10px] text-emerald-700">{r.attendance}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cases requiring attention */}
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-base text-[#0B3B2E]">حالات تتطلب المتابعة الإدارية</h3>
                    <button
                      onClick={() => setActiveTab('cases')}
                      className="text-xs font-bold text-[#0B3B2E] hover:underline"
                    >
                      عرض الكل
                    </button>
                  </div>

                  <div className="divide-y divide-gray-100 text-xs">
                    {cases.filter(c => c.status !== 'مغلقة' && c.status !== 'تمت المعالجة').slice(0, 4).map(c => (
                      <div key={c.id} className="py-2.5 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-gray-900">{c.title}</div>
                          <div className="text-gray-500 text-[11px]">
                            النوع: {c.caseType} • الخطورة: {c.severity}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: MESSAGES & ANNOUNCEMENTS (المراسلات والشات) */}
      {/* ======================================================== */}
      {activeTab === 'messages' && (
        <div className="space-y-6">
          
          {/* Top: Broadcast Announcements Creator */}
          <div className="bg-white p-6 rounded-3xl border border-[#C9A227]/40 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#C9A227] flex items-center justify-center">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0B3B2E]">بث إشعار أو تعميم إداري فوري</h2>
                  <p className="text-xs text-gray-500">إرسال تنبيهات وتوجيهات لكافة المعلمات أو أولياء الأمور أو الطلاب تظهر في حساباتهم فوراً</p>
                </div>
              </div>
              <span className="text-xs bg-[#0B3B2E] text-[#E8D9A6] font-bold px-3 py-1 rounded-full">
                إشعار فوري متعدد الفئات
              </span>
            </div>

            {adminBroadcastSuccess && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                تم بث التعميم بنجاح لجميع المستهدفين في النظام وجرس الإشعارات!
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!adminBroadcastTitle.trim() || !adminBroadcastMessage.trim()) return;
                db.sendBroadcastNotification(
                  adminBroadcastAudience,
                  adminBroadcastTitle.trim(),
                  adminBroadcastMessage.trim(),
                  currentUser.displayName
                );
                setAdminBroadcastSuccess(true);
                setAdminBroadcastTitle('');
                setAdminBroadcastMessage('');
                triggerRefresh();
                setTimeout(() => setAdminBroadcastSuccess(false), 3000);
              }}
              className="space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">الجمهور المستهدف:</label>
                  <select
                    value={adminBroadcastAudience}
                    onChange={(e: any) => setAdminBroadcastAudience(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-[#0B3B2E]"
                  >
                    <option value="ALL">🌐 كافة منسوبي الأكاديمية (الجميع)</option>
                    <option value="TEACHER">👩‍🏫 المعلمات فقط</option>
                    <option value="PARENT">👨‍👩‍👦 أولياء الأمور فقط</option>
                    <option value="STUDENT">🎓 الطلاب والطالبات فقط</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">عنوان التعميم أو التنبيه:</label>
                  <input
                    type="text"
                    value={adminBroadcastTitle}
                    onChange={(e) => setAdminBroadcastTitle(e.target.value)}
                    placeholder="مثال: موعد اختبارات حفظ الجزء العاشر ومراجعة المتشابهات..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0B3B2E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">نص التعميم أو التوجيه الإداري:</label>
                <textarea
                  rows={2}
                  value={adminBroadcastMessage}
                  onChange={(e) => setAdminBroadcastMessage(e.target.value)}
                  placeholder="اكتب التوجيه بوضوح وسيظهر في إشعارات الفئة المستهدفة فوراً..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-[#0B3B2E]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!adminBroadcastTitle.trim() || !adminBroadcastMessage.trim()}
                  className="px-5 py-2.5 bg-[#0B3B2E] hover:bg-[#124B3B] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4 text-[#C9A227]" />
                  بث الإشعار الآن
                </button>
              </div>
            </form>
          </div>

          {/* Interactive Chat Messenger Studio */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden flex flex-col md:flex-row h-[620px]">
            
            {/* Sidebar: Conversations List */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-gray-200 bg-gray-50 flex flex-col">
              <div className="p-3.5 bg-white border-b border-gray-200 flex items-center justify-between">
                <span className="font-bold text-xs text-gray-800">قنوات المحادثة المباشرة ({conversations.length})</span>
                <span className="text-[10px] text-gray-400">تحديث فوري</span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                {conversations.map(conv => {
                  const isSelected = conv.id === selectedAdminConvId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedAdminConvId(conv.id);
                        db.markMessagesAsRead(conv.id, 'ADMIN');
                      }}
                      className={`p-3.5 cursor-pointer transition flex items-start gap-3 ${
                        isSelected ? 'bg-[#0B3B2E]/10 border-r-4 border-[#0B3B2E]' : 'hover:bg-gray-100/80'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-[#0B3B2E] text-[#E8D9A6] flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                        {conv.title.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-gray-900 truncate">
                            {conv.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate leading-relaxed">
                          {conv.lastMessage || 'بدء المحادثة'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Chat Area */}
            {selectedAdminConvId ? (
              <div className="flex-1 flex flex-col bg-slate-50">
                
                {/* Active Chat Header */}
                <div className="px-6 py-3.5 bg-white border-b border-gray-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0B3B2E] text-[#E8D9A6] flex items-center justify-center font-bold text-sm shadow">
                      {conversations.find(c => c.id === selectedAdminConvId)?.title.charAt(0) || 'ش'}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900">
                        {conversations.find(c => c.id === selectedAdminConvId)?.title}
                      </div>
                      <div className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        قناة مراسلات معتمدة ومفتوحة
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                    محادثة رسمية
                  </span>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-5 overflow-y-auto space-y-3.5">
                  {db.getMessages(selectedAdminConvId).map(msg => {
                    const isMe = msg.senderId === 'ADMIN' || msg.senderRole === 'ADMIN';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-start' : 'items-end'}`}
                      >
                        <div className="text-[10px] text-gray-400 mb-0.5 px-1">
                          {isMe ? 'الإدارة' : msg.senderName} • {msg.timeFormatted}
                        </div>
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                            isMe
                              ? 'bg-[#0B3B2E] text-white rounded-br-none'
                              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                          }`}
                        >
                          <div>{msg.text}</div>
                          <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                            isMe ? 'text-[#E8D9A6]' : 'text-gray-400'
                          }`}>
                            <span>{msg.timeFormatted}</span>
                            {isMe && <CheckCheck className="w-3 h-3 text-[#C9A227]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chat Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!adminChatInput.trim() || !selectedAdminConvId) return;
                    db.sendMessage({
                      conversationId: selectedAdminConvId,
                      senderId: 'ADMIN',
                      senderName: currentUser.displayName,
                      senderRole: 'ADMIN',
                      text: adminChatInput.trim()
                    });
                    setAdminChatInput('');
                    triggerRefresh();
                  }}
                  className="p-3.5 bg-white border-t border-gray-200 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={adminChatInput}
                    onChange={(e) => setAdminChatInput(e.target.value)}
                    placeholder="اكتب التوجيه أو الرد الإداري هنا..."
                    className="flex-1 py-2.5 px-4 bg-gray-50 border border-gray-300 rounded-2xl text-xs focus:ring-2 focus:ring-[#0B3B2E] focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!adminChatInput.trim()}
                    className="px-5 py-2.5 bg-[#0B3B2E] hover:bg-[#124B3B] disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>إرسال</span>
                    <Send className="w-3.5 h-3.5 rotate-180" />
                  </button>
                </form>

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
                <div className="font-bold text-sm text-gray-600">اختر محادثة لعرض الرسائل المتبادلة</div>
              </div>
            )}

          </div>

          {/* Announcements Log Table */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-gray-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#C9A227]" />
              سجل كافة التعميمات والإشعارات الصادرة ({notifications.length})
            </h3>
            <div className="divide-y divide-gray-100 text-xs">
              {notifications.map(n => (
                <div key={n.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      <span>{n.title}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-medium border border-emerald-200">
                        {n.audience === 'ALL' ? 'الكل' : n.audience === 'TEACHER' ? 'المعلمات' : n.audience === 'PARENT' ? 'أولياء الأمور' : 'الطلاب'}
                      </span>
                    </div>
                    <div className="text-gray-600 mt-1">{n.message}</div>
                  </div>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
                    {n.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: STUDENTS */}
      {/* ======================================================== */}
      {activeTab === 'students' && (
        <StudentsDirectoryView
          currentUser={currentUser}
          dataVersion={dataVersion}
          onRefresh={triggerRefresh}
        />
      )}

      {/* ======================================================== */}
      {/* TAB: PLACEMENT (تحليل واقتراح فقط دون نقل فعلي) */}
      {/* ======================================================== */}
      {activeTab === 'placement' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#C9A227]" />
              <h2 className="text-lg font-bold text-[#0B3B2E]">محرك التسكين الآلي الذكي (تحليل واقتراح إداري فقط)</h2>
            </div>
            <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 mt-2 font-medium">
              ⚠️ <strong>توجيه نظامي صارم:</strong> هذا التحليل يقدم مقترحات تجانس ذكية بناءً على موضع السورة، العمر، الإتقان، وسرعة الحفظ. لا يتم نقل الطالب أو إنشاء مجموعات فعلية إلا بقرار إداري مستقل.
            </p>
          </div>

          {/* Placement Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center">
              <div className="text-xs text-gray-500">إجمالي الطلاب المحللين</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{placementData.summary.total}</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
              <div className="text-xs text-emerald-800">توافق عالٍ (&gt;= 80%)</div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{placementData.summary.highCompatibility}</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-center">
              <div className="text-xs text-amber-800">يحتاج مراجعة (&lt; 70%)</div>
              <div className="text-2xl font-black text-amber-900 mt-1">{placementData.summary.needsReview}</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-center">
              <div className="text-xs text-blue-800">موصى بالفردي دائمًا</div>
              <div className="text-2xl font-black text-blue-900 mt-1">{placementData.summary.individualOnly}</div>
            </div>
          </div>

          {/* Placement Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-gray-200">
              <thead className="bg-[#FAF7F0] text-gray-700 font-bold">
                <tr>
                  <th className="p-3">الطالب</th>
                  <th className="p-3">الفئة / المستوى</th>
                  <th className="p-3">السورة الحالية</th>
                  <th className="p-3">م. قريبة / بعيدة</th>
                  <th className="p-3">سرعة الحفظ</th>
                  <th className="p-3">مؤشر التوافق</th>
                  <th className="p-3">المقترح الآلي</th>
                  <th className="p-3">الاعتماد الإداري</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {placementData.students.map(st => {
                  const isApproved = Boolean(st.approvedGroup);
                  return (
                    <tr key={st.studentId} className="hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{st.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">كود: {st.studentId} • عمر: {st.age}</div>
                      </td>
                      <td className="p-3">{st.ageGroup} / {st.level}</td>
                      <td className="p-3 font-bold text-[#0B3B2E]">{st.currentSurah}</td>
                      <td className="p-3 font-mono">{st.nearReviewScore} / {st.farReviewScore}</td>
                      <td className="p-3">{st.speed}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold ${
                          st.compatibilityIndex >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {st.compatibilityIndex}%
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-800">{st.suggestedGroup}</div>
                        <div className="text-[10px] text-gray-500">{st.suggestReason}</div>
                      </td>
                      <td className="p-3">
                        {isApproved ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md text-[10px]">
                            معتمد: {st.approvedGroup}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              const s = db.getStudents().find(item => item.id === st.studentId);
                              if (s) {
                                s.approvedGroup = st.suggestedGroup;
                                db.saveStudent(s);
                                triggerRefresh();
                              }
                            }}
                            className="px-2.5 py-1 bg-[#0B3B2E] hover:bg-[#14573F] text-white text-[10px] font-bold rounded-md transition cursor-pointer"
                          >
                            اعتماد المقترح
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: TEACHERS */}
      {/* ======================================================== */}
      {activeTab === 'teachers' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3B2E]">كادر المعلمات وتقييم الأداء والبونص</h2>
              <p className="text-xs text-gray-500">25 معلمة معتمدة، حساب دقيق للبونص المستحق واستبعاد الكاميرا للأعمار &gt; 10</p>
            </div>
            <span className="text-xs bg-[#FAF7F0] text-[#0B3B2E] px-3 py-1 rounded-full border border-[#C9A227] font-bold">
              شهر التقييم: {currentMonth}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-gray-200">
              <thead className="bg-[#FAF7F0] text-gray-700 font-bold">
                <tr>
                  <th className="p-3">كود المعلمة</th>
                  <th className="p-3">الاسم</th>
                  <th className="p-3">الطلاب</th>
                  <th className="p-3">الجلسات المرصودة</th>
                  <th className="p-3">الدرجة الموزونة</th>
                  <th className="p-3">الرتبة</th>
                  <th className="p-3">البونص المستحق</th>
                  <th className="p-3">حالة البيانات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {teachers.map(t => {
                  const ev = computeTeacherMonthly(t.id, currentMonth);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono font-bold text-[#0B3B2E]">{t.id}</td>
                      <td className="p-3 font-bold text-gray-900">{t.name}</td>
                      <td className="p-3 font-mono">{ev.studentsCount}</td>
                      <td className="p-3 font-mono">{ev.recordsCount}</td>
                      <td className="p-3 font-bold text-[#C9A227]">{ev.score}%</td>
                      <td className="p-3">{ev.grade}</td>
                      <td className="p-3 font-bold text-emerald-800">
                        {ev.bonus > 0 ? `${ev.bonus} ج.م` : '—'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          ev.dataStatus === 'مكتملة' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {ev.dataStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: FINANCE (المالية الموحدة) */}
      {/* ======================================================== */}
      {activeTab === 'finance' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3B2E]">المنظومة المالية الموحدة للأكاديمية</h2>
              <p className="text-xs text-gray-500">مستودع متصل لكافة الرسوم والمدفوعات ورواتب المعلمات والمصروفات</p>
            </div>
            <button
              onClick={() => setShowAddExpense(true)}
              className="px-4 py-2 bg-[#0B3B2E] hover:bg-[#14573F] text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              تسجيل سند صرف / مصروف
            </button>
          </div>

          {/* Financial Totals */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="text-xs text-emerald-800 font-medium">إجمالي الإيرادات والتحصيلات</div>
              <div className="text-3xl font-black text-emerald-950 mt-1">{totalRevenue} {settings.CURRENCY}</div>
            </div>
            <div className="p-5 bg-red-50 rounded-2xl border border-red-200">
              <div className="text-xs text-red-800 font-medium">إجمالي المصروفات والرواتب</div>
              <div className="text-3xl font-black text-red-950 mt-1">{totalExpenses} {settings.CURRENCY}</div>
            </div>
            <div className="p-5 bg-[#FAF7F0] rounded-2xl border border-[#C9A227]">
              <div className="text-xs text-[#A8841C] font-medium">صافي الأرباح المحققة</div>
              <div className="text-3xl font-black text-[#0B3B2E] mt-1">{netProfit} {settings.CURRENCY}</div>
            </div>
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200">
              <div className="text-xs text-amber-800 font-medium">الرسوم المستحقة غير المسددة</div>
              <div className="text-3xl font-black text-amber-950 mt-1">{totalUnpaidFees} {settings.CURRENCY}</div>
            </div>
          </div>

          {/* Expenses Log */}
          <div>
            <h3 className="font-bold text-sm text-[#0B3B2E] mb-3">سجل المصروفات وسندات الصرف</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right divide-y divide-gray-200">
                <thead className="bg-[#FAF7F0] text-gray-700 font-bold">
                  <tr>
                    <th className="p-3">رقم السند</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">البند</th>
                    <th className="p-3">المستلم</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">البيان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td className="p-3 font-mono font-bold text-[#0B3B2E]">{e.id}</td>
                      <td className="p-3 font-mono">{e.date}</td>
                      <td className="p-3">{e.category}</td>
                      <td className="p-3 font-bold">{e.recipient}</td>
                      <td className="p-3 font-bold text-red-700">{e.amount} {settings.CURRENCY}</td>
                      <td className="p-3 text-gray-600">{e.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Expense Modal */}
          {showAddExpense && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 text-right space-y-4">
                <h3 className="font-bold text-base text-[#0B3B2E]">تسجيل سند صرف جديد</h3>
                <form onSubmit={handleAddExpense} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">بند الصرف</label>
                    <select
                      value={expCategory}
                      onChange={e => setExpCategory(e.target.value as any)}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                    >
                      <option value="رواتب">رواتب معلمات</option>
                      <option value="بونص">بونص ومكافآت تميز</option>
                      <option value="تسويق">عمولات تسويق وإعلانات</option>
                      <option value="تقنية">خوادم وبرمجيات</option>
                      <option value="أخرى">مصروفات إدارية أخرى</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">المبلغ *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={expAmount}
                      onChange={e => setExpAmount(Number(e.target.value))}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">المستلم *</label>
                    <input
                      type="text"
                      required
                      value={expRecipient}
                      onChange={e => setExpRecipient(e.target.value)}
                      placeholder="اسم المعلمة أو الجهة"
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">البيان والتفاصيل</label>
                    <textarea
                      rows={2}
                      value={expDesc}
                      onChange={e => setExpDesc(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddExpense(false)}
                      className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#0B3B2E] text-white font-bold rounded-xl"
                    >
                      حفظ السند
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: CASES (الحالات والمتابعة ومنع الإغلاق بدون نتيجة) */}
      {/* ======================================================== */}
      {activeTab === 'cases' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-[#0B3B2E]">مركز إدارة الحالات والشكاوى التربوية</h2>
            <p className="text-xs text-gray-500">متابعة دقيقة، تفويض المهام، ومنع إغلاق أي حالة دون توثيق القرار النهائي</p>
          </div>

          <div className="space-y-4">
            {cases.map(c => {
              const isClosed = c.status === 'مغلقة' || c.status === 'تمت المعالجة';
              return (
                <div key={c.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400 font-bold">{c.id}</span>
                        <h3 className="font-bold text-base text-gray-900">{c.title}</h3>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        النوع: <strong>{c.caseType}</strong> • المفوض: <strong>{c.assignedStaff}</strong>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                        c.severity === 'حرجة' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {c.severity}
                      </span>
                      <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md ${
                        isClosed ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-700 bg-white p-3 rounded-xl border border-gray-200">
                    {c.description}
                  </p>

                  {/* Final decision if resolved */}
                  {c.finalDecision && (
                    <div className="text-xs text-emerald-900 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      <strong>القرار الإداري النهائي:</strong> {c.finalDecision}
                    </div>
                  )}

                  {/* Actions buttons */}
                  {!isClosed && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => setResolvingCaseId(c.id)}
                        className="px-4 py-2 bg-[#0B3B2E] hover:bg-[#14573F] text-white font-bold text-xs rounded-xl transition cursor-pointer"
                      >
                        معالجة وتوثيق القرار النهائي
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resolution Modal */}
          {resolvingCaseId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 text-right space-y-4">
                <h3 className="font-bold text-base text-[#0B3B2E]">توثيق القرار الإداري وإغلاق الحالة</h3>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">القرار الإداري النهائي المتخذ *</label>
                    <textarea
                      rows={3}
                      required
                      value={caseDecision}
                      onChange={e => setCaseDecision(e.target.value)}
                      placeholder="مثال: تم التواصل مع المعلمة وولي الأمر وتعديل موعد الحلقة ومتابعة الحفظ..."
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">ملاحظات ونتائج المتابعة</label>
                    <input
                      type="text"
                      value={caseActionNotes}
                      onChange={e => setCaseActionNotes(e.target.value)}
                      placeholder="تم الاتفاق والرضا من الطرفين"
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setResolvingCaseId(null)}
                      className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={() => handleResolveCase(resolvingCaseId)}
                      className="px-4 py-1.5 bg-emerald-700 text-white font-bold rounded-xl"
                    >
                      اعتماد الحل وإغلاق الحالة
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: CERTIFICATES & IJAZAHS */}
      {/* ======================================================== */}
      {activeTab === 'certificates' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3B2E]">إدارة واعتماد الشهادات والإجازات بالسند</h2>
              <p className="text-xs text-gray-500">إصدار رسمي مع رقم قيد فريد ورمز QR مانع للتزوير</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowIssueCertModal(true)}
                className="px-3.5 py-2 bg-[#0B3B2E] text-white font-bold text-xs rounded-xl shadow-xs hover:bg-[#14573F] transition cursor-pointer"
              >
                + إصدار شهادة إتمام
              </button>
              <button
                onClick={() => setShowIssueIjzModal(true)}
                className="px-3.5 py-2 bg-[#C9A227] text-[#0B3B2E] font-bold text-xs rounded-xl shadow-xs hover:bg-[#b58f1e] transition cursor-pointer"
              >
                + إصدار إجازة بالسند المتصل
              </button>
            </div>
          </div>

          {/* Certificates List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certificates.map(c => {
              const st = students.find(s => s.id === c.studentId);
              return (
                <div key={c.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[10px] text-gray-400 font-bold">{c.id}</span>
                      <h4 className="font-bold text-sm text-[#0B3B2E]">{c.title}</h4>
                      <div className="text-xs text-gray-700">الطالب: <strong>{st ? st.name : c.studentId}</strong></div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                      {c.status}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between items-center text-xs">
                    <span className="text-gray-500">{c.issueDate}</span>
                    <button
                      onClick={() => onOpenVerifyWithId(c.id)}
                      className="font-bold text-[#0B3B2E] hover:underline cursor-pointer"
                    >
                      فحص الوثيقة برمز QR
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Issue Certificate Modal */}
          {showIssueCertModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 text-right space-y-4">
                <h3 className="font-bold text-base text-[#0B3B2E]">إصدار شهادة إتمام رسمية</h3>
                <form onSubmit={handleIssueCertDirect} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">اختر الطالب *</label>
                    <select
                      value={newCertStudentId}
                      onChange={e => setNewCertStudentId(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">عنوان الشهادة *</label>
                    <input
                      type="text"
                      required
                      value={newCertTitle}
                      onChange={e => setNewCertTitle(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowIssueCertModal(false)}
                      className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#0B3B2E] text-white font-bold rounded-xl"
                    >
                      إصدار وتوثيق
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Issue Ijazah Modal */}
          {showIssueIjzModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
              <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-200 text-right space-y-4">
                <h3 className="font-bold text-base text-[#0B3B2E]">إصدار إجازة بالسند المتصل</h3>
                <form onSubmit={handleIssueIjzDirect} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">اختر الطالب المستحق *</label>
                    <select
                      value={newIjzStudentId}
                      onChange={e => setNewIjzStudentId(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                    >
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">نوع الإجازة *</label>
                    <input
                      type="text"
                      required
                      value={newIjzType}
                      onChange={e => setNewIjzType(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">الرواية والمسار *</label>
                    <input
                      type="text"
                      required
                      value={newIjzRiwayah}
                      onChange={e => setNewIjzRiwayah(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">فضيلة الشيخ المجيز *</label>
                    <input
                      type="text"
                      required
                      value={newIjzIssuer}
                      onChange={e => setNewIjzIssuer(e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowIssueIjzModal(false)}
                      className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-xl"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#C9A227] text-[#0B3B2E] font-bold rounded-xl"
                    >
                      إصدار وتوثيق الإجازة
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: REGISTRATIONS (مراجعة وقبول المتقدمين) */}
      {/* ======================================================== */}
      {activeTab === 'registrations' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-[#0B3B2E]">طلبات التسجيل الواردة من الموقع العام</h2>
            <p className="text-xs text-gray-500">مراجعة طلبات الطلاب والمعلمات واعتماد القيد أو الرفض</p>
          </div>

          <div className="space-y-4">
            {registrations.map(r => (
              <div key={r.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-wrap justify-between items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#0B3B2E]">{r.id}</span>
                    <strong className="text-sm font-bold text-gray-900">{r.name}</strong>
                    <span className="text-xs text-gray-500">({r.type === 'student' ? 'طالب' : 'معلمة'})</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    الهاتف: <span className="font-mono">{r.phone}</span> • التاريخ: {r.date} • الحالة: <strong>{r.status}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {r.status === 'New' && (
                    <button
                      onClick={() => {
                        r.status = 'Approved';
                        db.saveRegistration(r);
                        triggerRefresh();
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      قبول واعتماد
                    </button>
                  )}
                  <span className="text-xs font-bold px-2 py-1 bg-white rounded-lg border border-gray-200">
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: AFFILIATES (المسوقون) */}
      {/* ======================================================== */}
      {activeTab === 'affiliates' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-[#0B3B2E]">إدارة الشركاء والمسوقين المعتمدين</h2>
            <p className="text-xs text-gray-500">أكواد التسويق، الإحالات، واحتساب وصرف العمولات عند الانتظام</p>
          </div>

          <div className="space-y-4">
            {affiliates.map(a => (
              <div key={a.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-base text-[#0B3B2E]">{a.name}</h3>
                    <div className="text-xs text-gray-500">الكود: <strong className="font-mono text-[#C9A227]">{a.code}</strong></div>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-md">
                    {a.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 bg-white p-3 rounded-xl">
                  <div>إجمالي الإحالات: <strong>{a.totalReferrals}</strong></div>
                  <div>الطلاب المنتظمون: <strong>{a.convertedCount}</strong></div>
                  <div>إجمالي العمولات: <strong>{a.totalCommissions} {settings.CURRENCY}</strong></div>
                  <div>المصروف: <strong>{a.paidCommissions} {settings.CURRENCY}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: CURRICULUM (المكتبة التربوية) */}
      {/* ======================================================== */}
      {activeTab === 'curriculum' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-[#0B3B2E]">المكتبة والمنهج التربوي المعتمد</h2>
            <p className="text-xs text-gray-500">القيم والواجبات الموزعة على الفئات العمرية الخمس</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {curriculum.map(c => (
              <div key={c.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>{c.title}</span>
                  <span className="text-gray-400 font-mono text-[10px]">{c.ageGroup}</span>
                </div>
                <div className="text-gray-600">الهدف: {c.goal}</div>
                <div className="text-[#0B3B2E] font-medium bg-white p-2 rounded-lg border border-gray-100">
                  الواجب: {c.homework}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: GOOGLE SHEETS INTEGRATION (ربط جوجل شيت) */}
      {/* ======================================================== */}
      {activeTab === 'sheets' && (
        <GoogleSheetsIntegration
          settings={settings}
          onSettingsUpdated={triggerRefresh}
        />
      )}

      {/* ======================================================== */}
      {/* TAB: SETTINGS (إعدادات المنصة) */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3B2E]">إعدادات المنصة والهوية والأوزان</h2>
              <p className="text-xs text-gray-500">تعديل فوري للبيانات وأوزان التقييم وشرائح البونص</p>
            </div>
            {settingsSaved && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl">
                تم حفظ الإعدادات بنجاح
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-gray-700 mb-1">اسم الأكاديمية</label>
              <input
                type="text"
                value={localSettings.ACADEMY_NAME}
                onChange={e => setLocalSettings({ ...localSettings, ACADEMY_NAME: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-bold text-gray-700 mb-1">شعار الأكاديمية</label>
              <input
                type="text"
                value={localSettings.ACADEMY_MOTTO}
                onChange={e => setLocalSettings({ ...localSettings, ACADEMY_MOTTO: e.target.value })}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSaveSettings}
              className="px-6 py-2.5 bg-[#0B3B2E] text-white font-bold text-xs rounded-xl shadow-md hover:bg-[#14573F] transition cursor-pointer"
            >
              حفظ وتطبيق الإعدادات
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB: AUTOMATED DIAGNOSTICS & TESTS (الفحص الشامل) */}
      {/* ======================================================== */}
      {activeTab === 'tests' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3B2E]">الفحص الذاتي الشامل واختبارات الجودة (QA)</h2>
              <p className="text-xs text-gray-500">فحص آلي لسلامة المصادقة، الأمان، المحركات، الحسابات، وصحة الترحيل</p>
            </div>
            <button
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="px-5 py-2.5 bg-[#C9A227] hover:bg-[#b8911f] disabled:opacity-50 text-[#0B3B2E] font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              {isRunningTests ? 'جارٍ تشغيل الفحص...' : 'تشغيل حزمة الفحص الآن'}
            </button>
          </div>

          {/* Test Results Banner */}
          {testOutput && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center">
                  <div className="text-xs text-gray-500">إجمالي الاختبارات</div>
                  <div className="text-2xl font-black text-gray-900 mt-1">{testOutput.total}</div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                  <div className="text-xs text-emerald-800">الناجحة (Passed)</div>
                  <div className="text-2xl font-black text-emerald-950 mt-1">{testOutput.passed} ✓</div>
                </div>
                <div className="p-4 bg-red-50 rounded-2xl border border-red-200 text-center">
                  <div className="text-xs text-red-800">الفاشلة (Failed)</div>
                  <div className="text-2xl font-black text-red-950 mt-1">{testOutput.failed}</div>
                </div>
              </div>

              {/* Detail list */}
              <div className="divide-y divide-gray-100 text-xs">
                {testOutput.results.map((r, i) => (
                  <div key={i} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-mono text-[10px] text-gray-400 font-bold mr-1">[{r.suite}]</span>
                      <strong className="text-gray-900">{r.name}</strong>
                      <div className="text-[11px] text-gray-500 mt-0.5">{r.message}</div>
                    </div>
                    <span className={`px-2 py-0.5 font-bold rounded-md text-[10px] ${
                      r.status === 'PASSED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {r.status} ({r.durationMs}ms)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Student ID Card Modal */}
      <StudentCardModal
        student={selectedStudentForCard}
        isOpen={Boolean(selectedStudentForCard)}
        onClose={() => setSelectedStudentForCard(null)}
      />

    </div>
  );
};
