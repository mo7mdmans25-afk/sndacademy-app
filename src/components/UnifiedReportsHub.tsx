import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Share2,
  Printer,
  Sparkles,
  UserCheck,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  BookOpen,
  Eye,
  FileSpreadsheet,
  Grid,
  List,
  Layers,
  Smartphone,
  Check,
  RefreshCw,
  Award,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  GraduationCap,
  ShieldAlert,
  FileText,
  Download,
  Copy,
  ChevronDown
} from 'lucide-react';
import {
  ReportPeriodType,
  ReportDomainType,
  DailyReportViewMode,
  DailyReportFilterStatus,
  TeacherReportSummary,
  TeacherWeeklySummary,
  StudentWeeklySummary,
  TeacherMonthlySummary,
  StudentMonthlySummary,
  AcademyDailyStats,
  AcademyPeriodStats
} from '../types/dailyReport';
import { SessionUser } from '../types/index';
import { db } from '../services/database';
import {
  getTodayDateString,
  getCurrentMonthString,
  getArabicDayName,
  formatSimpleArabicDate,
  formatFullArabicDate,
  formatMonthArabic,
  shiftDate,
  getWeekRange,
  getPreviousWeekRange,
  getPreviousMonth
} from '../utils/reportDateUtils';
import {
  aggregateDailyTeacherSummaries,
  aggregateWeeklyTeacherSummaries,
  aggregateWeeklyStudentSummaries,
  aggregateMonthlyTeacherSummaries,
  aggregateMonthlyStudentSummaries,
  aggregatePeriodAcademyStats,
  exportToCsv
} from '../services/reportsAnalyticsService';
import { ReportShareModal } from './ReportShareModal';
import { TeacherReportDetailModal } from './TeacherReportDetailModal';
import { notificationService } from '../services/notificationService';

interface UnifiedReportsHubProps {
  currentUser: SessionUser;
  dataVersion: number;
  onRefresh: () => void;
  onOpenTeacherChat?: (teacherId: string) => void;
}

export const UnifiedReportsHub: React.FC<UnifiedReportsHubProps> = ({
  currentUser,
  dataVersion,
  onRefresh,
  onOpenTeacherChat
}) => {
  // 1. REPORT PERIOD SELECTION: 'daily' | 'weekly' | 'monthly'
  const [periodType, setPeriodType] = useState<ReportPeriodType>(() => {
    return (localStorage.getItem('sanad_report_period_type') as ReportPeriodType) || 'daily';
  });

  const handleSetPeriodType = (type: ReportPeriodType) => {
    setPeriodType(type);
    try {
      localStorage.setItem('sanad_report_period_type', type);
    } catch (e) {
      // Ignore
    }
  };

  // 2. REPORT DOMAIN SELECTION
  const [domainType, setDomainType] = useState<ReportDomainType>(() => {
    return (localStorage.getItem('sanad_report_domain_type') as ReportDomainType) || 'academy';
  });

  const handleSetDomainType = (domain: ReportDomainType) => {
    setDomainType(domain);
    try {
      localStorage.setItem('sanad_report_domain_type', domain);
    } catch (e) {
      // Ignore
    }
  };

  // 3. DATE & PERIOD STATES
  // Daily Date State (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // Weekly Date Range State (defaults to current week Sunday-Saturday)
  const initialWeek = useMemo(() => getWeekRange(getTodayDateString()), []);
  const [weekStartDate, setWeekStartDate] = useState<string>(initialWeek.start);
  const [weekEndDate, setWeekEndDate] = useState<string>(initialWeek.end);

  // Monthly State (defaults to current month YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());

  // 4. VIEW MODE
  const [viewMode, setViewMode] = useState<DailyReportViewMode>(() => {
    return (localStorage.getItem('sanad_report_view_mode') as DailyReportViewMode) || 'cards';
  });

  const handleSetViewMode = (mode: DailyReportViewMode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('sanad_report_view_mode', mode);
    } catch (e) {
      // Ignore
    }
  };

  // 5. SEARCH & FILTERS (Optimized with Debounce)
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DailyReportFilterStatus>('ALL');
  const [teacherFilter, setTeacherFilter] = useState<string>('ALL');
  const [circleFilter, setCircleFilter] = useState<string>('ALL');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 6. MODALS STATE
  const [detailModalSummary, setDetailModalSummary] = useState<TeacherReportSummary | null>(null);
  const [shareModalConfig, setShareModalConfig] = useState<{
    isOpen: boolean;
    scope: 'teacher' | 'academy';
    teacher: TeacherReportSummary | null;
  }>({
    isOpen: false,
    scope: 'academy',
    teacher: null
  });

  // 7. CORE DATABASE ENTITIES (Reactive to dataVersion)
  const teachers = useMemo(() => db.getTeachers(), [dataVersion]);
  const students = useMemo(() => db.getStudents(), [dataVersion]);
  const records = useMemo(() => db.getRecords(), [dataVersion]);
  const schedules = useMemo(() => db.getSchedules(), [dataVersion]);
  const fees = useMemo(() => db.getFees(), [dataVersion]);
  const payments = useMemo(() => db.getPayments(), [dataVersion]);
  const expenses = useMemo(() => db.getExpenses(), [dataVersion]);
  const certificates = useMemo(() => db.getCertificates(), [dataVersion]);
  const cases = useMemo(() => db.getCases(), [dataVersion]);
  const settings = useMemo(() => db.getSettings(), [dataVersion]);

  // Derived Date Details
  const arabicDayName = useMemo(() => getArabicDayName(selectedDate), [selectedDate]);
  const formattedDateSimple = useMemo(() => formatSimpleArabicDate(selectedDate), [selectedDate]);
  const displayDateArabic = useMemo(() => formatFullArabicDate(selectedDate), [selectedDate]);
  const displayMonthArabic = useMemo(() => formatMonthArabic(selectedMonth), [selectedMonth]);

  // ========================================================
  // AGGREGATIONS (Calculated purely from real records)
  // ========================================================

  // A. Daily Teachers Summary
  const dailyTeacherSummaries: TeacherReportSummary[] = useMemo(() => {
    return aggregateDailyTeacherSummaries(records, schedules, teachers, selectedDate);
  }, [records, schedules, teachers, selectedDate]);

  // Daily Academy Stats
  const academyDailyStats: AcademyDailyStats = useMemo(() => {
    let totalScheduled = 0;
    let totalRecorded = 0;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalExcused = 0;
    let totalUnrecorded = 0;
    let completedReportsCount = 0;
    let incompleteReportsCount = 0;
    let notSubmittedReportsCount = 0;
    let noSessionsCount = 0;

    dailyTeacherSummaries.forEach((s) => {
      totalScheduled += s.scheduledCount;
      totalRecorded += s.recordedCount;
      totalPresent += s.presentCount;
      totalAbsent += s.absentCount;
      totalExcused += s.excusedCount;
      totalUnrecorded += s.unrecordedCount;

      if (s.status === 'COMPLETE') completedReportsCount++;
      else if (s.status === 'PARTIAL') incompleteReportsCount++;
      else if (s.status === 'NOT_SUBMITTED') notSubmittedReportsCount++;
      else if (s.status === 'NO_SESSIONS') noSessionsCount++;
    });

    const totalEvaluated = totalPresent + totalAbsent + totalExcused;
    const overallAttendanceRate = totalEvaluated > 0 ? Math.round((totalPresent / totalEvaluated) * 100) : 0;

    return {
      date: selectedDate,
      displayDateArabic,
      formattedDateSimple,
      dayName: arabicDayName,
      totalTeachers: teachers.length,
      activeTeachers: teachers.filter(t => t.status === 'نشطة').length,
      scheduledSessions: totalScheduled,
      recordedSessions: totalRecorded,
      presentCount: totalPresent,
      absentCount: totalAbsent,
      excusedCount: totalExcused,
      unrecordedCount: totalUnrecorded,
      overallAttendanceRate,
      completedReportsCount,
      incompleteReportsCount,
      notSubmittedReportsCount,
      noSessionsCount
    };
  }, [dailyTeacherSummaries, selectedDate, displayDateArabic, formattedDateSimple, arabicDayName, teachers]);

  // B. Weekly Aggregations
  const prevWeekRange = useMemo(() => getPreviousWeekRange(weekStartDate), [weekStartDate]);

  const weeklyTeacherSummaries: TeacherWeeklySummary[] = useMemo(() => {
    return aggregateWeeklyTeacherSummaries(records, schedules, teachers, weekStartDate, weekEndDate);
  }, [records, schedules, teachers, weekStartDate, weekEndDate]);

  const weeklyStudentSummaries: StudentWeeklySummary[] = useMemo(() => {
    return aggregateWeeklyStudentSummaries(records, students, weekStartDate, weekEndDate);
  }, [records, students, weekStartDate, weekEndDate]);

  const weeklyAcademyStats: AcademyPeriodStats = useMemo(() => {
    return aggregatePeriodAcademyStats(
      records,
      schedules,
      teachers,
      students,
      fees,
      payments,
      expenses,
      'weekly',
      weekStartDate,
      weekEndDate,
      prevWeekRange.start,
      prevWeekRange.end
    );
  }, [records, schedules, teachers, students, fees, payments, expenses, weekStartDate, weekEndDate, prevWeekRange]);

  // C. Monthly Aggregations
  const prevMonthStr = useMemo(() => getPreviousMonth(selectedMonth), [selectedMonth]);
  const monthStart = `${selectedMonth}-01`;
  const monthEnd = `${selectedMonth}-31`;
  const prevMonthStart = `${prevMonthStr}-01`;
  const prevMonthEnd = `${prevMonthStr}-31`;

  const monthlyTeacherSummaries: TeacherMonthlySummary[] = useMemo(() => {
    return aggregateMonthlyTeacherSummaries(records, schedules, teachers, selectedMonth);
  }, [records, schedules, teachers, selectedMonth]);

  const monthlyStudentSummaries: StudentMonthlySummary[] = useMemo(() => {
    return aggregateMonthlyStudentSummaries(records, students, certificates, selectedMonth);
  }, [records, students, certificates, selectedMonth]);

  const monthlyAcademyStats: AcademyPeriodStats = useMemo(() => {
    return aggregatePeriodAcademyStats(
      records,
      schedules,
      teachers,
      students,
      fees,
      payments,
      expenses,
      'monthly',
      monthStart,
      monthEnd,
      prevMonthStart,
      prevMonthEnd
    );
  }, [records, schedules, teachers, students, fees, payments, expenses, selectedMonth, monthStart, monthEnd, prevMonthStart, prevMonthEnd]);

  // ========================================================
  // FILTERING LOGIC
  // ========================================================

  const filteredDailyTeachers = useMemo(() => {
    return dailyTeacherSummaries.filter((s) => {
      if (teacherFilter !== 'ALL' && s.teacher.id !== teacherFilter) return false;
      if (statusFilter === 'COMPLETE' && s.status !== 'COMPLETE') return false;
      if (statusFilter === 'PARTIAL' && s.status !== 'PARTIAL') return false;
      if (statusFilter === 'NOT_SUBMITTED' && s.status !== 'NOT_SUBMITTED') return false;
      if (statusFilter === 'HAS_REPORT' && s.recordedCount === 0) return false;
      if (statusFilter === 'ACTIVE' && s.teacher.status !== 'نشطة') return false;
      if (statusFilter === 'INACTIVE' && s.teacher.status === 'نشطة') return false;

      if (debouncedSearch.trim()) {
        const query = debouncedSearch.trim().toLowerCase();
        const matchesName = s.teacher.name.toLowerCase().includes(query) || s.teacher.id.toLowerCase().includes(query);
        const matchesStudent = s.records.some(r => {
          const st = students.find(x => x.id === r.studentId);
          return st ? st.name.toLowerCase().includes(query) || st.id.toLowerCase().includes(query) : false;
        });
        if (!matchesName && !matchesStudent) return false;
      }
      return true;
    });
  }, [dailyTeacherSummaries, teacherFilter, statusFilter, debouncedSearch, students]);

  const filteredWeeklyTeachers = useMemo(() => {
    return weeklyTeacherSummaries.filter((s) => {
      if (teacherFilter !== 'ALL' && s.teacher.id !== teacherFilter) return false;
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim().toLowerCase();
        if (!s.teacher.name.toLowerCase().includes(q) && !s.teacher.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [weeklyTeacherSummaries, teacherFilter, debouncedSearch]);

  const filteredWeeklyStudents = useMemo(() => {
    return weeklyStudentSummaries.filter((s) => {
      if (circleFilter !== 'ALL' && s.student.circleType !== circleFilter) return false;
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim().toLowerCase();
        if (!s.student.name.toLowerCase().includes(q) && !s.student.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [weeklyStudentSummaries, circleFilter, debouncedSearch]);

  const filteredMonthlyTeachers = useMemo(() => {
    return monthlyTeacherSummaries.filter((s) => {
      if (teacherFilter !== 'ALL' && s.teacher.id !== teacherFilter) return false;
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim().toLowerCase();
        if (!s.teacher.name.toLowerCase().includes(q) && !s.teacher.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [monthlyTeacherSummaries, teacherFilter, debouncedSearch]);

  const filteredMonthlyStudents = useMemo(() => {
    return monthlyStudentSummaries.filter((s) => {
      if (circleFilter !== 'ALL' && s.student.circleType !== circleFilter) return false;
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.trim().toLowerCase();
        if (!s.student.name.toLowerCase().includes(q) && !s.student.id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [monthlyStudentSummaries, circleFilter, debouncedSearch]);

  // Quick WhatsApp Share for Daily Teacher
  const handleTeacherDailyWhatsAppShare = (summary: TeacherReportSummary) => {
    const message =
      `*أكاديمية السند المتصل لخدمة القرآن الكريم*\n` +
      `_«نَجُودُ بِالعِلْمِ .. وَنَصِلُ السَّنَدَ .. وَنَبْنِي الأَثَرَ»_\n\n` +
      `📅 *تقرير يوم:* ${summary.formattedDateSimple} (${summary.displayDateArabic})\n` +
      `👩‍🏫 *المعلمة:* ${summary.teacher.name}\n` +
      `-----------------------------------------\n` +
      `📊 *الجلسات المجدولة:* ${summary.scheduledCount}\n` +
      `📝 *السجلات المرصودة:* ${summary.recordedCount}\n` +
      `✅ *الحضور:* ${summary.presentCount}\n` +
      `❌ *الغياب:* ${summary.absentCount}\n` +
      `🟡 *الاعتذارات:* ${summary.excusedCount}\n` +
      `📈 *نسبة الحضور:* ${summary.attendanceRate}%\n` +
      `حالة التقرير: ${summary.status === 'COMPLETE' ? '✅ مكتمل' : summary.status === 'PARTIAL' ? '⚠️ مكتمل جزئيًا' : '⏳ بانتظار الرصد'}`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // CSV Export Action
  const handleExportCsv = () => {
    if (periodType === 'daily') {
      const headers = ['المعلمة', 'التاريخ', 'المجدول', 'المرصود', 'حاضر', 'غائب', 'اعتذار', 'غير مسجل', 'نسبة الحضور %', 'حالة التقرير'];
      const rows = filteredDailyTeachers.map(s => [
        s.teacher.name,
        s.formattedDateSimple,
        s.scheduledCount,
        s.recordedCount,
        s.presentCount,
        s.absentCount,
        s.excusedCount,
        s.unrecordedCount,
        `${s.attendanceRate}%`,
        s.status === 'COMPLETE' ? 'مكتمل' : s.status === 'PARTIAL' ? 'جزئي' : s.status === 'NOT_SUBMITTED' ? 'لم يسجل' : 'لا جلسات'
      ]);
      exportToCsv(`Sanad_Daily_Report_${selectedDate}`, headers, rows);
      notificationService.success('تم تصدير التقرير اليومي بصيغة Excel (CSV) بنجاح!');
    } else if (periodType === 'weekly') {
      const headers = ['المعلمة', 'الفترة', 'المجدول', 'المرصود', 'حاضر', 'غائب', 'اعتذار', 'نسبة الحضور %', 'متوسط الدرجات %', 'الواجبات المكتملة'];
      const rows = filteredWeeklyTeachers.map(s => [
        s.teacher.name,
        s.periodLabel,
        s.scheduledCount,
        s.recordedCount,
        s.presentCount,
        s.absentCount,
        s.excusedCount,
        `${s.attendanceRate}%`,
        `${s.averageStudentScore}%`,
        `${s.completedHomeworks}/${s.totalHomeworks}`
      ]);
      exportToCsv(`Sanad_Weekly_Report_${weekStartDate}_${weekEndDate}`, headers, rows);
      notificationService.success('تم تصدير التقرير الأسبوعي بصيغة Excel (CSV) بنجاح!');
    } else {
      const headers = ['المعلمة', 'الشهر', 'أيام العمل', 'الجلسات المرصودة', 'نسبة الحضور %', 'الطلاب المرصودون', 'متوسط أداء الطلاب %', 'اكتمال التقارير %'];
      const rows = filteredMonthlyTeachers.map(s => [
        s.teacher.name,
        s.monthLabel,
        s.workingDaysCount,
        s.recordedCount,
        `${s.attendanceRate}%`,
        s.studentsCount,
        `${s.averageStudentPerformance}%`,
        `${s.reportCompletenessRate}%`
      ]);
      exportToCsv(`Sanad_Monthly_Report_${selectedMonth}`, headers, rows);
      notificationService.success('تم تصدير التقرير الشهري بصيغة Excel (CSV) بنجاح!');
    }
  };

  return (
    <div className="space-y-6 text-right">

      {/* ======================================================== */}
      {/* 1. TOP HEADER & PERIOD SEGMENTED CONTROL */}
      {/* ======================================================== */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#C9A227] flex items-center justify-center font-bold shadow-2xs">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-[#0B3B2E]">مركز التقارير الموحد</h1>
                <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  مباشر وموثق
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                «نَجُودُ بِالعِلْمِ .. وَنَصِلُ السَّنَدَ .. وَنَبْنِي الأَثَرَ» — منصة تقارير شاملة للجلسات والحصص والأداء
              </p>
            </div>
          </div>

          {/* Global Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShareModalConfig({
                  isOpen: true,
                  scope: 'academy',
                  teacher: null
                });
              }}
              className="px-4 py-2.5 bg-[#C9A227] hover:bg-[#b8911f] text-[#0B3B2E] font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              مشاركة تقرير الأكاديمية
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="تصدير بيانات التقرير إلى ملف Excel / CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetViewMode('print')}
              className="px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              title="طباعة التقرير الرسمي"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onRefresh();
                notificationService.success('تم تحديث بيانات التقارير بنجاح!');
              }}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition cursor-pointer"
              title="تحديث البيانات المباشرة"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* PERIOD SEGMENTED CONTROL: [ 📅 يومي ] [ 📆 أسبوعي ] [ 🗓️ شهري ] */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex p-1.5 bg-gray-100 rounded-2xl border border-gray-200 shadow-inner">
            <button
              type="button"
              onClick={() => handleSetPeriodType('daily')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                periodType === 'daily'
                  ? 'bg-[#0B3B2E] text-white shadow-md'
                  : 'text-gray-700 hover:text-[#0B3B2E]'
              }`}
            >
              <Calendar className="w-4 h-4 text-[#C9A227]" />
              <span>📅 التقرير اليومي المباشر</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetPeriodType('weekly')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                periodType === 'weekly'
                  ? 'bg-[#0B3B2E] text-white shadow-md'
                  : 'text-gray-700 hover:text-[#0B3B2E]'
              }`}
            >
              <Clock className="w-4 h-4 text-[#C9A227]" />
              <span>📆 التقرير الأسبوعي المجمع</span>
            </button>

            <button
              type="button"
              onClick={() => handleSetPeriodType('monthly')}
              className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                periodType === 'monthly'
                  ? 'bg-[#0B3B2E] text-white shadow-md'
                  : 'text-gray-700 hover:text-[#0B3B2E]'
              }`}
            >
              <Layers className="w-4 h-4 text-[#C9A227]" />
              <span>🗓️ التقرير الشهري الشامل</span>
            </button>
          </div>

          {/* Period Selector Dynamic Controls */}
          {periodType === 'daily' && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="اليوم السابق"
              >
                <ChevronRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getTodayDateString())}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedDate === getTodayDateString()
                    ? 'bg-[#0B3B2E] text-white shadow-xs'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                اليوم الحالي
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                title="اليوم التالي"
              >
                <span>التالي</span>
                <ChevronLeft className="w-4 h-4" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedDate(e.target.value);
                }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 cursor-pointer focus:ring-2 focus:ring-[#0B3B2E]"
              />

              <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-[#0B3B2E]">
                {displayDateArabic} ({formattedDateSimple})
              </div>
            </div>
          )}

          {periodType === 'weekly' && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => {
                  const curr = getWeekRange(getTodayDateString());
                  setWeekStartDate(curr.start);
                  setWeekEndDate(curr.end);
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold cursor-pointer"
              >
                الأسبوع الحالي
              </button>

              <button
                type="button"
                onClick={() => {
                  const prev = getPreviousWeekRange(getTodayDateString());
                  setWeekStartDate(prev.start);
                  setWeekEndDate(prev.end);
                }}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold cursor-pointer"
              >
                الأسبوع السابق
              </button>

              <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200">
                <span className="text-gray-400 px-1">من:</span>
                <input
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  className="bg-white px-2 py-1 rounded-lg text-xs font-bold"
                />
                <span className="text-gray-400 px-1">إلى:</span>
                <input
                  type="date"
                  value={weekEndDate}
                  onChange={(e) => setWeekEndDate(e.target.value)}
                  className="bg-white px-2 py-1 rounded-lg text-xs font-bold"
                />
              </div>
            </div>
          )}

          {periodType === 'monthly' && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => setSelectedMonth(getCurrentMonthString())}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold cursor-pointer"
              >
                الشهر الحالي
              </button>

              <button
                type="button"
                onClick={() => setSelectedMonth(getPreviousMonth(getCurrentMonthString()))}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold cursor-pointer"
              >
                الشهر السابق
              </button>

              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  if (e.target.value) setSelectedMonth(e.target.value);
                }}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 cursor-pointer"
              />

              <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-black text-amber-900">
                📅 {displayMonthArabic}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ======================================================== */}
      {/* 2. REPORT DOMAINS NAVIGATION (أنواع التقارير الـ 12) */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2.5 rounded-2xl border border-gray-200 shadow-2xs text-xs font-bold scrollbar-thin">
        {[
          { id: 'academy', label: '📊 تقرير الأكاديمية العام', icon: Sparkles },
          { id: 'teachers', label: `👩‍🏫 تقرير المعلمات (${teachers.length})`, icon: UserCheck },
          { id: 'students', label: `👨‍🎓 تقارير أداء الطلاب (${students.length})`, icon: Users },
          { id: 'memorization', label: '📚 الحفظ والمراجعة', icon: BookOpen },
          { id: 'attendance', label: '✅ الحضور والغياب', icon: CheckCircle2 },
          { id: 'homework', label: '📝 متابعة الواجبات', icon: FileText },
          { id: 'values', label: '🌱 القيم التربوية', icon: Sparkles },
          { id: 'exemplary', label: '🏆 الطلاب المثاليون', icon: Award },
          { id: 'finance', label: '💰 التقرير المالي', icon: DollarSign, adminOnly: true },
          { id: 'certificates', label: `🎓 الشهادات (${certificates.length})`, icon: GraduationCap },
          { id: 'cases', label: `⚠️ متابعة الحالات (${cases.length})`, icon: ShieldAlert }
        ].map((domain) => {
          if (domain.adminOnly && currentUser.role !== 'ADMIN') return null;
          const Icon = domain.icon;
          const isActive = domainType === domain.id;
          return (
            <button
              key={domain.id}
              type="button"
              onClick={() => handleSetDomainType(domain.id as ReportDomainType)}
              className={`shrink-0 px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#0B3B2E] text-white shadow-xs'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#C9A227]' : 'text-gray-500'}`} />
              <span>{domain.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 3. PERIOD COMPARISON & KPI SUMMARY BAR */}
      {/* ======================================================== */}
      {periodType === 'daily' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center">
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-[10px] text-gray-400 font-medium">إجمالي المعلمات</div>
            <div className="text-2xl font-black text-[#0B3B2E] mt-1">{academyDailyStats.totalTeachers}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">{academyDailyStats.activeTeachers} معلمات نشطة</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-[10px] text-gray-400 font-medium">جلسات مجدولة اليوم</div>
            <div className="text-2xl font-black text-[#0B3B2E] mt-1">{academyDailyStats.scheduledSessions}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">يوم {academyDailyStats.dayName}</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-[10px] text-gray-400 font-medium">السجلات المرصودة</div>
            <div className="text-2xl font-black text-[#C9A227] mt-1">{academyDailyStats.recordedSessions}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">سجل معتمد</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-[10px] text-gray-400 font-medium">إجمالي الحضور</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{academyDailyStats.presentCount}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">حاضر ومتأخر</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-[10px] text-gray-400 font-medium">إجمالي الغياب</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{academyDailyStats.absentCount}</div>
            <div className="text-[10px] text-rose-700 mt-0.5">بدون عذر</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-[10px] text-gray-400 font-medium">الاعتذارات</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{academyDailyStats.excusedCount}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">مسبقة ومقبولة</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-[10px] text-gray-400 font-medium">نسبة الحضور</div>
            <div className="text-2xl font-black text-[#0B3B2E] mt-1">{academyDailyStats.overallAttendanceRate}%</div>
            <div className="text-[10px] text-gray-500 mt-0.5">معدل الانضباط</div>
          </div>
          <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="text-[10px] text-gray-400 font-medium">تقارير غير مكتملة</div>
            <div className="text-2xl font-black text-purple-600 mt-1">
              {academyDailyStats.incompleteReportsCount + academyDailyStats.notSubmittedReportsCount}
            </div>
            <div className="text-[10px] text-purple-700 mt-0.5">بحاجة لمتابعة</div>
          </div>
        </div>
      )}

      {(periodType === 'weekly' || periodType === 'monthly') && (
        <div className="space-y-4">
          {/* Main KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-center">
            {(() => {
              const stats = periodType === 'weekly' ? weeklyAcademyStats : monthlyAcademyStats;
              return (
                <>
                  <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-400">إجمالي الجلسات المرصودة</div>
                    <div className="text-2xl font-black text-[#0B3B2E] mt-1">{stats.totalRecorded}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{stats.periodLabel}</div>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-400">نسبة الحضور العامة</div>
                    <div className="text-2xl font-black text-emerald-600 mt-1">{stats.overallAttendanceRate}%</div>
                    <div className="text-[10px] text-emerald-700 mt-0.5">
                      حضور: {stats.totalPresent} | غياب: {stats.totalAbsent}
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-400">متوسط درجات الطلاب</div>
                    <div className="text-2xl font-black text-[#C9A227] mt-1">{stats.averageDayScore}%</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">معدل التحصيل الأكاديمي</div>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-400">معدل إنجاز الواجبات</div>
                    <div className="text-2xl font-black text-blue-600 mt-1">{stats.homeworkCompletionRate}%</div>
                    <div className="text-[10px] text-blue-700 mt-0.5">{stats.totalHomeworks} واجب مسند</div>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-400">القيم التربوية المغروسة</div>
                    <div className="text-2xl font-black text-teal-600 mt-1">{stats.valuesInstilledCount}</div>
                    <div className="text-[10px] text-teal-700 mt-0.5">قيمة وسلوك مطبق</div>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                    <div className="text-[10px] text-gray-400">صافي التدفق المالي</div>
                    <div className="text-2xl font-black text-emerald-700 mt-1">{stats.netProfit} {settings.CURRENCY}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">إيراد: {stats.revenue} | مصروف: {stats.expenses}</div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Period Comparison Delta Banner (المقارنة مع الفترة السابقة) */}
          {(() => {
            const stats = periodType === 'weekly' ? weeklyAcademyStats : monthlyAcademyStats;
            if (!stats.comparison) return null;
            const { attendanceRateDelta, recordedSessionsDelta, averageScoreDelta } = stats.comparison;

            return (
              <div className="bg-gradient-to-r from-emerald-500/10 via-amber-500/5 to-transparent p-4 rounded-2xl border border-emerald-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 font-bold text-[#0B3B2E]">
                  <TrendingUp className="w-4 h-4 text-[#C9A227]" />
                  <span>
                    المقارنة بالفترة السابقة ({periodType === 'weekly' ? 'الأسبوع الماضي' : 'الشهر الماضي'}):
                  </span>
                </div>

                <div className="flex items-center gap-6 flex-wrap font-bold">
                  {/* Attendance Delta */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">نسبة الحضور:</span>
                    <span className={attendanceRateDelta.trend === 'up' ? 'text-emerald-700' : attendanceRateDelta.trend === 'down' ? 'text-rose-700' : 'text-gray-700'}>
                      {attendanceRateDelta.trend === 'up' && '↑ تحسن '}
                      {attendanceRateDelta.trend === 'down' && '↓ انخفاض '}
                      {attendanceRateDelta.trend === 'stable' && '→ مستقر '}
                      ({attendanceRateDelta.delta > 0 ? `+${attendanceRateDelta.delta}` : attendanceRateDelta.delta}%)
                    </span>
                  </div>

                  {/* Sessions Delta */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">الجلسات المرصودة:</span>
                    <span className={recordedSessionsDelta.trend === 'up' ? 'text-emerald-700' : recordedSessionsDelta.trend === 'down' ? 'text-rose-700' : 'text-gray-700'}>
                      {recordedSessionsDelta.trend === 'up' && '↑ زيادة '}
                      {recordedSessionsDelta.trend === 'down' && '↓ تراجع '}
                      {recordedSessionsDelta.trend === 'stable' && '→ مستقر '}
                      ({recordedSessionsDelta.delta > 0 ? `+${recordedSessionsDelta.delta}` : recordedSessionsDelta.delta} جلسة)
                    </span>
                  </div>

                  {/* Average Score Delta */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-500">متوسط الأداء:</span>
                    <span className={averageScoreDelta.trend === 'up' ? 'text-emerald-700' : averageScoreDelta.trend === 'down' ? 'text-rose-700' : 'text-gray-700'}>
                      {averageScoreDelta.trend === 'up' && '↑ تحسن '}
                      {averageScoreDelta.trend === 'down' && '↓ تراجع '}
                      {averageScoreDelta.trend === 'stable' && '→ مستقر '}
                      ({averageScoreDelta.delta > 0 ? `+${averageScoreDelta.delta}` : averageScoreDelta.delta}%)
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. VIEW MODES TOOLBAR & DYNAMIC FILTERS */}
      {/* ======================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* View Mode Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold scrollbar-thin">
          {[
            { id: 'cards', label: 'البطاقات', icon: Grid },
            { id: 'table', label: 'الجدولي', icon: List },
            { id: 'compact', label: 'المختصر', icon: Layers },
            { id: 'byTeacher', label: 'حسب المعلمة', icon: UserCheck },
            { id: 'byStudent', label: 'حسب الطالب', icon: Users },
            { id: 'analytics', label: 'مؤشرات بيانية', icon: TrendingUp },
            { id: 'shareCards', label: 'بطاقات المشاركة', icon: Share2 }
          ].map((mode) => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => handleSetViewMode(mode.id as DailyReportViewMode)}
                className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#0B3B2E] text-white shadow-xs'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#C9A227]' : 'text-gray-500'}`} />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="بحث بالمعلمة، الطالب، ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pr-9 pl-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs w-44 sm:w-56 focus:outline-none focus:ring-2 focus:ring-[#0B3B2E]"
            />
          </div>

          {/* Teacher Dropdown */}
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">جميع المعلمات ({teachers.length})</option>
            {teachers.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Status Dropdown (when Daily) */}
          {periodType === 'daily' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DailyReportFilterStatus)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">حالة التقرير: الكل</option>
              <option value="COMPLETE">مكتمل فقط</option>
              <option value="PARTIAL">جزئي فقط</option>
              <option value="NOT_SUBMITTED">لم يسجل بعد</option>
              <option value="HAS_REPORT">لديها سجلات</option>
            </select>
          )}

          {/* Circle Dropdown (when Students) */}
          {(domainType === 'students' || viewMode === 'byStudent') && (
            <select
              value={circleFilter}
              onChange={(e) => setCircleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">نوع الحلقة: الكل</option>
              <option value="فردي">فردي</option>
              <option value="جماعي">جماعي</option>
              <option value="إتقان">إتقان</option>
            </select>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MAIN CONTENT RENDERING PER PERIOD & DOMAIN */}
      {/* ======================================================== */}

      {/* A. DAILY PERIOD RENDERING */}
      {periodType === 'daily' && (
        <>
          {/* Domain: Teachers or Overview */}
          {(domainType === 'teachers' || domainType === 'academy') && viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDailyTeachers.map((summary) => (
                <div
                  key={summary.teacher.id}
                  className="bg-white rounded-3xl border border-gray-200 shadow-xs hover:shadow-md hover:border-[#C9A227]/60 transition p-5 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#0B3B2E] text-[#C9A227] flex items-center justify-center font-black text-lg shadow-inner">
                          {summary.teacher.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-black text-base text-gray-900">{summary.teacher.name}</h3>
                          <div className="text-xs text-gray-400">
                            {summary.teacher.teachingMode} • الطاقة: {summary.teacher.capacity} طالب
                          </div>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
                          summary.status === 'COMPLETE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : summary.status === 'PARTIAL'
                            ? 'bg-amber-100 text-amber-800'
                            : summary.status === 'NOT_SUBMITTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {summary.status === 'COMPLETE'
                          ? '✅ مكتمل'
                          : summary.status === 'PARTIAL'
                          ? '⚠️ مكتمل جزئيًا'
                          : summary.status === 'NOT_SUBMITTED'
                          ? '❌ لم يسجل التقرير'
                          : '⚪ لا توجد جلسات'}
                      </span>
                    </div>

                    {/* MANDATORY: Prominently Display Date Inside Every Teacher Card */}
                    <div className="mt-3.5 px-3 py-1.5 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-center justify-between text-xs text-amber-900 font-bold">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#C9A227]" />
                        <span>تقرير يوم: {summary.formattedDateSimple}</span>
                      </span>
                      <span className="text-[11px] text-amber-800/80">({summary.dayName})</span>
                    </div>

                    {/* Card Statistics Grid */}
                    <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                      <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <div className="text-[10px] text-gray-400">المجدول</div>
                        <div className="text-base font-black text-[#0B3B2E] mt-0.5">{summary.scheduledCount}</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <div className="text-[10px] text-gray-400">المسجل</div>
                        <div className="text-base font-black text-[#C9A227] mt-0.5">{summary.recordedCount}</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <div className="text-[10px] text-gray-400">الحضور</div>
                        <div className="text-base font-black text-emerald-600 mt-0.5">{summary.presentCount}</div>
                      </div>
                      <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <div className="text-[10px] text-gray-400">النسبة</div>
                        <div className="text-base font-black text-[#0B3B2E] mt-0.5">{summary.attendanceRate}%</div>
                      </div>
                    </div>

                    {/* Attendance Progress Bar */}
                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>نسبة الانضباط والحضور</span>
                        <span>{summary.attendanceRate}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            summary.attendanceRate >= 90
                              ? 'bg-emerald-500'
                              : summary.attendanceRate >= 70
                              ? 'bg-[#C9A227]'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${summary.attendanceRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Brief Student Badges Preview */}
                    {summary.records.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                        <div className="text-[11px] font-bold text-gray-500">الطلاب المرصودون اليوم:</div>
                        <div className="flex flex-wrap gap-1.5">
                          {summary.records.slice(0, 3).map((r) => {
                            const st = students.find(s => s.id === r.studentId);
                            return (
                              <span
                                key={r.id}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${
                                  r.attendance === 'حاضر'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : r.attendance === 'متأخر'
                                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                    : r.attendance === 'اعتذار'
                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                                }`}
                              >
                                <span>{st ? st.name.split(' ')[0] : r.studentId}</span>
                                <span className="text-[9px] opacity-75">({r.attendance})</span>
                              </span>
                            );
                          })}
                          {summary.records.length > 3 && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-bold">
                              +{summary.records.length - 3} آخرين
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailModalSummary(summary)}
                      className="flex-1 py-2 px-3 bg-[#0B3B2E] hover:bg-[#124B3B] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#C9A227]" />
                      فتح تفاصيل التقرير
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShareModalConfig({
                          isOpen: true,
                          scope: 'teacher',
                          teacher: summary
                        });
                      }}
                      className="p-2 bg-amber-50 hover:bg-amber-100 text-[#0B3B2E] border border-[#C9A227]/40 rounded-xl transition cursor-pointer"
                      title="مشاركة تقرير المعلمة"
                    >
                      <Share2 className="w-4 h-4 text-[#C9A227]" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTeacherDailyWhatsAppShare(summary)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition cursor-pointer"
                      title="مشاركة مباشرة عبر واتساب"
                    >
                      <Smartphone className="w-4 h-4 text-emerald-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table View (when viewMode === 'table') */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#0B3B2E] text-white">
                    <tr>
                      <th className="p-3.5 font-bold">المعلمة</th>
                      <th className="p-3.5 font-bold">تقرير يوم</th>
                      <th className="p-3.5 font-bold text-center">المجدول</th>
                      <th className="p-3.5 font-bold text-center">المرصود</th>
                      <th className="p-3.5 font-bold text-center">حاضر</th>
                      <th className="p-3.5 font-bold text-center">غائب</th>
                      <th className="p-3.5 font-bold text-center">اعتذار</th>
                      <th className="p-3.5 font-bold text-center">غير مسجل</th>
                      <th className="p-3.5 font-bold text-center">نسبة الحضور</th>
                      <th className="p-3.5 font-bold text-center">حالة التقرير</th>
                      <th className="p-3.5 font-bold text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredDailyTeachers.map((summary) => (
                      <tr key={summary.teacher.id} className="hover:bg-gray-50/80 transition">
                        <td className="p-3.5 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-50 text-[#C9A227] flex items-center justify-center font-bold text-xs">
                              {summary.teacher.name.charAt(0)}
                            </div>
                            <div>
                              <div>{summary.teacher.name}</div>
                              <div className="text-[10px] text-gray-400 font-normal">{summary.teacher.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-gray-600 whitespace-nowrap font-bold">
                          {summary.formattedDateSimple} ({summary.dayName})
                        </td>
                        <td className="p-3.5 text-center font-bold text-gray-700">{summary.scheduledCount}</td>
                        <td className="p-3.5 text-center font-bold text-[#C9A227]">{summary.recordedCount}</td>
                        <td className="p-3.5 text-center font-bold text-emerald-600">{summary.presentCount}</td>
                        <td className="p-3.5 text-center font-bold text-rose-600">{summary.absentCount}</td>
                        <td className="p-3.5 text-center font-bold text-amber-600">{summary.excusedCount}</td>
                        <td className="p-3.5 text-center font-bold text-purple-600">{summary.unrecordedCount}</td>
                        <td className="p-3.5 text-center font-black text-[#0B3B2E]">{summary.attendanceRate}%</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block ${
                              summary.status === 'COMPLETE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : summary.status === 'PARTIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : summary.status === 'NOT_SUBMITTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {summary.status === 'COMPLETE' ? '✅ مكتمل' : summary.status === 'PARTIAL' ? '⚠️ جزئي' : summary.status === 'NOT_SUBMITTED' ? '❌ معلق' : '⚪ لا حصص'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailModalSummary(summary)}
                              className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition cursor-pointer"
                              title="عرض التفاصيل"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShareModalConfig({
                                  isOpen: true,
                                  scope: 'teacher',
                                  teacher: summary
                                });
                              }}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-[#0B3B2E] rounded-lg transition cursor-pointer"
                              title="مشاركة"
                            >
                              <Share2 className="w-3.5 h-3.5 text-[#C9A227]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Compact View */}
          {viewMode === 'compact' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {filteredDailyTeachers.map((summary) => (
                <div
                  key={summary.teacher.id}
                  onClick={() => setDetailModalSummary(summary)}
                  className="bg-white p-3.5 rounded-2xl border border-gray-200 hover:border-[#0B3B2E] hover:shadow-xs transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <strong className="font-bold text-gray-900 text-xs">{summary.teacher.name}</strong>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                        summary.status === 'COMPLETE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : summary.status === 'PARTIAL'
                          ? 'bg-amber-100 text-amber-800'
                          : summary.status === 'NOT_SUBMITTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {summary.status === 'COMPLETE' ? 'مكتمل' : summary.status === 'PARTIAL' ? 'جزئي' : summary.status === 'NOT_SUBMITTED' ? 'معلق' : 'لا جلسات'}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-400">
                    📅 {summary.formattedDateSimple} • مجدول: {summary.scheduledCount} | مرصود: {summary.recordedCount}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-600 bg-gray-50 p-1.5 rounded-lg">
                    <span>حضور: <strong className="text-emerald-700">{summary.presentCount}</strong></span>
                    <span>غياب: <strong className="text-rose-700">{summary.absentCount}</strong></span>
                    <span>النسبة: <strong className="text-[#0B3B2E]">{summary.attendanceRate}%</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* B. WEEKLY PERIOD RENDERING */}
      {periodType === 'weekly' && (
        <div className="space-y-6">
          {/* Domain: Teachers Weekly Report */}
          {(domainType === 'teachers' || domainType === 'academy') && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
                <div>
                  <h3 className="font-black text-sm text-[#0B3B2E]">التقرير الأسبوعي التراكمي للمعلمات</h3>
                  <div className="text-xs text-gray-500">الفترة: من {formatSimpleArabicDate(weekStartDate)} إلى {formatSimpleArabicDate(weekEndDate)}</div>
                </div>
                <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-xl border border-emerald-200">
                  {filteredWeeklyTeachers.length} معلمات
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredWeeklyTeachers.map((summary) => (
                  <div
                    key={summary.teacher.id}
                    className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      {/* Teacher Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#0B3B2E] text-[#C9A227] flex items-center justify-center font-black text-lg shadow-inner">
                            {summary.teacher.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-black text-base text-gray-900">{summary.teacher.name}</h4>
                            <div className="text-xs text-gray-500">
                              📅 الفترة: من {formatSimpleArabicDate(summary.startDate)} إلى {formatSimpleArabicDate(summary.endDate)}
                            </div>
                          </div>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          summary.attendanceRate >= 85 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          نسبة الحضور: {summary.attendanceRate}%
                        </span>
                      </div>

                      {/* Weekly Metrics Tiles */}
                      <div className="grid grid-cols-4 gap-2 mt-4 text-center">
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                          <div className="text-[10px] text-gray-400">المجدول الأسبوعي</div>
                          <div className="text-base font-black text-[#0B3B2E] mt-0.5">{summary.scheduledCount}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                          <div className="text-[10px] text-gray-400">المرصود الفعلي</div>
                          <div className="text-base font-black text-[#C9A227] mt-0.5">{summary.recordedCount}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                          <div className="text-[10px] text-gray-400">الحضور الكلي</div>
                          <div className="text-base font-black text-emerald-600 mt-0.5">{summary.presentCount}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                          <div className="text-[10px] text-gray-400">الغياب والاعتذار</div>
                          <div className="text-base font-black text-rose-600 mt-0.5">{summary.absentCount + summary.excusedCount}</div>
                        </div>
                      </div>

                      {/* Performance & Follow-up Row */}
                      <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                        <div>
                          <div className="text-[10px] text-gray-400">متوسط درجات الطلاب</div>
                          <strong className="text-[#0B3B2E] font-black">{summary.averageStudentScore}%</strong>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400">الواجبات المكتملة</div>
                          <strong className="text-blue-700 font-bold">{summary.completedHomeworks} / {summary.totalHomeworks}</strong>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400">القيم التربوية المطبقة</div>
                          <strong className="text-teal-700 font-bold">{summary.totalValuesGiven}</strong>
                        </div>
                      </div>

                      {/* Day-by-Day Mini Breakdown Table (الأحد، الإثنين، ...) */}
                      <div className="mt-4 pt-3 border-t border-gray-100 space-y-2">
                        <div className="text-[11px] font-bold text-gray-600">جدول أيام الأسبوع المختصر:</div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                          {summary.dailyBreakdown.map((b) => (
                            <div key={b.date} className="bg-gray-50 p-1 rounded-lg border border-gray-100">
                              <div className="font-bold text-gray-700">{b.dayName}</div>
                              <div className="text-emerald-700 font-bold mt-0.5">{b.present}ح</div>
                              <div className="text-rose-700 text-[9px]">{b.absent}غ</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-400">الطلاب المرصودون: {summary.evaluatedStudentsCount}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const msg = `تقرير المعلمة ${summary.teacher.name} للأسبوع (${summary.periodLabel}): حضور ${summary.attendanceRate}%، متوسط الأداء ${summary.averageStudentScore}%`;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>مشاركة واتساب</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Domain: Students Weekly Report */}
          {domainType === 'students' && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 font-bold text-sm text-[#0B3B2E] flex justify-between items-center">
                <span>تقرير أداء الطلاب الأسبوعي ({filteredWeeklyStudents.length})</span>
                <span className="text-xs text-gray-400">الفترة: من {formatSimpleArabicDate(weekStartDate)} إلى {formatSimpleArabicDate(weekEndDate)}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#0B3B2E] text-white">
                    <tr>
                      <th className="p-3.5 font-bold">الطالب</th>
                      <th className="p-3.5 font-bold text-center">الجلسات</th>
                      <th className="p-3.5 font-bold text-center">حضور / غياب</th>
                      <th className="p-3.5 font-bold text-center">نسبة الحضور</th>
                      <th className="p-3.5 font-bold">الحفظ الجديد المنجز</th>
                      <th className="p-3.5 font-bold text-center">الواجبات</th>
                      <th className="p-3.5 font-bold text-center">متوسط الدرجة</th>
                      <th className="p-3.5 font-bold text-center">التقدم الأسبوعي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredWeeklyStudents.map((s) => (
                      <tr key={s.student.id} className="hover:bg-gray-50/80 transition">
                        <td className="p-3.5 font-bold text-gray-900">
                          <div>{s.student.name}</div>
                          <div className="text-[10px] text-gray-400 font-normal">{s.student.id} • {s.student.level}</div>
                        </td>
                        <td className="p-3.5 text-center font-bold text-gray-700">{s.sessionsCount}</td>
                        <td className="p-3.5 text-center text-xs">
                          <span className="text-emerald-700 font-bold">{s.presentCount}</span> / <span className="text-rose-700 font-bold">{s.absentCount}</span>
                        </td>
                        <td className="p-3.5 text-center font-black text-[#0B3B2E]">{s.attendanceRate}%</td>
                        <td className="p-3.5 text-gray-700 max-w-xs truncate" title={s.newHifzAmount}>
                          {s.newHifzAmount}
                        </td>
                        <td className="p-3.5 text-center font-bold text-blue-700">
                          {s.homeworkCompleted} / {s.homeworkTotal}
                        </td>
                        <td className="p-3.5 text-center font-black text-amber-700">
                          {s.averageDayScore > 0 ? `${s.averageDayScore}%` : '—'}
                        </td>
                        <td className="p-3.5 text-center font-bold">
                          {s.progressDelta > 0 ? (
                            <span className="text-emerald-700">↑ +{s.progressDelta}%</span>
                          ) : s.progressDelta < 0 ? (
                            <span className="text-rose-700">↓ {s.progressDelta}%</span>
                          ) : (
                            <span className="text-gray-500">→ مستقر</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* C. MONTHLY PERIOD RENDERING */}
      {periodType === 'monthly' && (
        <div className="space-y-6">
          {/* Domain: Teachers Monthly Report */}
          {(domainType === 'teachers' || domainType === 'academy') && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
                <div>
                  <h3 className="font-black text-sm text-[#0B3B2E]">التقرير الشهري الشامل للمعلمات</h3>
                  <div className="text-xs text-gray-500">شهر: {displayMonthArabic}</div>
                </div>
                <span className="text-xs bg-amber-50 text-amber-900 font-black px-3 py-1 rounded-xl border border-amber-200">
                  {filteredMonthlyTeachers.length} معلمات
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredMonthlyTeachers.map((summary) => (
                  <div
                    key={summary.teacher.id}
                    className="bg-white rounded-3xl border border-gray-200 shadow-xs p-5 space-y-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-[#0B3B2E] text-[#C9A227] flex items-center justify-center font-black text-lg shadow-inner">
                            {summary.teacher.name.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-black text-base text-gray-900">{summary.teacher.name}</h4>
                            <div className="text-xs text-gray-500">
                              📅 شهر: {summary.monthLabel}
                            </div>
                          </div>
                        </div>

                        {summary.isDataIncomplete ? (
                          <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
                            ⚠️ بيانات غير مكتملة
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                            اكتمال: {summary.reportCompletenessRate}%
                          </span>
                        )}
                      </div>

                      {/* Monthly Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                          <div className="text-[10px] text-gray-400">أيام العمل</div>
                          <div className="text-base font-black text-[#0B3B2E] mt-0.5">{summary.workingDaysCount} يوم</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                          <div className="text-[10px] text-gray-400">الجلسات المرصودة</div>
                          <div className="text-base font-black text-[#C9A227] mt-0.5">{summary.recordedCount}</div>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                          <div className="text-[10px] text-gray-400">نسبة الحضور</div>
                          <div className="text-base font-black text-emerald-600 mt-0.5">{summary.attendanceRate}%</div>
                        </div>
                      </div>

                      {/* Detailed Monthly KPI Table */}
                      <div className="mt-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-gray-500">الطلاب الذين تم رصدهم:</span>
                          <strong className="text-gray-900 font-bold">{summary.studentsCount} طالب</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">متوسط أداء الطلاب:</span>
                          <strong className="text-[#0B3B2E] font-black">{summary.averageStudentPerformance}%</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">متوسط الحفظ والمراجعة:</span>
                          <span className="font-bold">
                            حفظ: {summary.averageHifzGrade} / 10 • مراجعة: {summary.averageReviewGrade} / 10
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">المنهج التربوي المطبق:</span>
                          <strong className="text-teal-700 font-bold">{summary.curriculumAppliedCount} قيمة</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">متابعة الواجبات:</span>
                          <strong className="text-blue-700 font-bold">{summary.homeworkFollowupRate}%</strong>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                      <span className="text-gray-400">كود: {summary.teacher.id}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const msg = `التقرير الشهري للمعلمة ${summary.teacher.name} (${summary.monthLabel}): أيام العمل ${summary.workingDaysCount}، الجلسات ${summary.recordedCount}، الحضور ${summary.attendanceRate}%، متوسط الأداء ${summary.averageStudentPerformance}%`;
                          window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
                        }}
                        className="text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>مشاركة ملخص الشهر</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Domain: Students Monthly Report */}
          {domainType === 'students' && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 font-bold text-sm text-[#0B3B2E] flex justify-between items-center">
                <span>تقرير أداء وتصنيف الطلاب الشهري ({filteredMonthlyStudents.length})</span>
                <span className="text-xs text-gray-400">شهر: {displayMonthArabic}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-[#0B3B2E] text-white">
                    <tr>
                      <th className="p-3.5 font-bold text-center">الترتيب</th>
                      <th className="p-3.5 font-bold">اسم الطالب</th>
                      <th className="p-3.5 font-bold text-center">الجلسات</th>
                      <th className="p-3.5 font-bold text-center">نسبة الحضور</th>
                      <th className="p-3.5 font-bold text-center">صفحات الحفظ</th>
                      <th className="p-3.5 font-bold text-center">إنجاز الواجبات</th>
                      <th className="p-3.5 font-bold text-center">الدرجة الشهرية</th>
                      <th className="p-3.5 font-bold text-center">الشهادات</th>
                      <th className="p-3.5 font-bold text-center">الطالب المثالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMonthlyStudents.map((s) => (
                      <tr key={s.student.id} className="hover:bg-gray-50/80 transition">
                        <td className="p-3.5 text-center font-black text-[#C9A227] text-sm">
                          #{s.rank}
                        </td>
                        <td className="p-3.5 font-bold text-gray-900">
                          <div>{s.student.name}</div>
                          <div className="text-[10px] text-gray-400 font-normal">{s.student.id} • {s.student.level}</div>
                        </td>
                        <td className="p-3.5 text-center font-bold text-gray-700">{s.sessionsCount}</td>
                        <td className="p-3.5 text-center font-black text-[#0B3B2E]">{s.attendanceRate}%</td>
                        <td className="p-3.5 text-center font-bold text-emerald-700">{s.newHifzPages} ص</td>
                        <td className="p-3.5 text-center font-bold text-blue-700">{s.homeworkRate}%</td>
                        <td className="p-3.5 text-center font-black text-amber-700 text-sm">
                          {s.monthlyScore > 0 ? `${s.monthlyScore}%` : '—'}
                        </td>
                        <td className="p-3.5 text-center font-bold text-gray-700">{s.certificatesCount}</td>
                        <td className="p-3.5 text-center">
                          {s.isExemplaryCandidate ? (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-[10px] font-black rounded-full border border-amber-300">
                              🏆 مرشح التكريم
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[10px]">مستمر</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* D. FINANCIAL REPORT DOMAIN (When Domain === 'finance') */}
      {domainType === 'finance' && currentUser.role === 'ADMIN' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-5">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-black text-base text-[#0B3B2E]">التقرير المالي الإداري المعتمد</h3>
              <p className="text-xs text-gray-500">حصر دقيق للإيرادات، المدفوعات، المصروفات، والمتأخرات</p>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
              محمي بصلاحيات الإدارة
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
              <div className="text-xs text-emerald-800">إجمالي الإيرادات والتحصيلات</div>
              <div className="text-2xl font-black text-emerald-900 mt-1">
                {payments.reduce((acc, p) => acc + p.amount, 0)} {settings.CURRENCY}
              </div>
              <div className="text-[10px] text-emerald-700 mt-0.5">{payments.length} عملية دفع</div>
            </div>

            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200">
              <div className="text-xs text-rose-800">إجمالي المصروفات التشغيلية</div>
              <div className="text-2xl font-black text-rose-900 mt-1">
                {expenses.reduce((acc, e) => acc + e.amount, 0)} {settings.CURRENCY}
              </div>
              <div className="text-[10px] text-rose-700 mt-0.5">{expenses.length} بند مصروف</div>
            </div>

            <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200">
              <div className="text-xs text-blue-800">صافي الأرباح والفوائض</div>
              <div className="text-2xl font-black text-blue-900 mt-1">
                {payments.reduce((acc, p) => acc + p.amount, 0) - expenses.reduce((acc, e) => acc + e.amount, 0)} {settings.CURRENCY}
              </div>
              <div className="text-[10px] text-blue-700 mt-0.5">الرصيد الصافي الفعلي</div>
            </div>

            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200">
              <div className="text-xs text-amber-800">المتأخرات والمستحقات المتبقية</div>
              <div className="text-2xl font-black text-amber-900 mt-1">
                {fees.filter(f => f.status === 'غير مدفوع' || f.status === 'متأخر').reduce((acc, f) => acc + (f.amount || 0), 0)} {settings.CURRENCY}
              </div>
              <div className="text-[10px] text-amber-700 mt-0.5">رسوم قيد التحصيل</div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODALS & SUB-COMPONENTS */}
      {/* ======================================================== */}
      <TeacherReportDetailModal
        isOpen={Boolean(detailModalSummary)}
        onClose={() => setDetailModalSummary(null)}
        summary={detailModalSummary}
        onOpenShare={(summary) => {
          setDetailModalSummary(null);
          setShareModalConfig({
            isOpen: true,
            scope: 'teacher',
            teacher: summary
          });
        }}
      />

      <ReportShareModal
        isOpen={shareModalConfig.isOpen}
        onClose={() => setShareModalConfig(prev => ({ ...prev, isOpen: false }))}
        reportDate={selectedDate}
        scope={shareModalConfig.scope}
        teacher={shareModalConfig.teacher}
        academyStats={academyDailyStats}
        settings={settings}
      />

    </div>
  );
};
