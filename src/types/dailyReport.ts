import { Teacher, Student, SessionRecord, StudentLessonSchedule } from './index';

export type ReportPeriodType = 'daily' | 'weekly' | 'monthly';

export type ReportDomainType =
  | 'academy'        // 📊 تقرير الأكاديمية
  | 'teachers'       // 👩‍🏫 تقرير المعلمات
  | 'students'       // 👨‍🎓 تقرير الطلاب
  | 'memorization'   // 📚 تقرير الحفظ والمراجعة
  | 'attendance'     // ✅ تقرير الحضور والغياب
  | 'homework'       // 📝 تقرير الواجبات
  | 'values'         // 🌱 تقرير القيمة التربوية
  | 'exemplary'      // 🏆 تقرير الطالب المثالي
  | 'finance'        // 💰 التقرير المالي
  | 'certificates'   // 🎓 تقرير الشهادات والإجازات
  | 'cases';         // ⚠️ تقرير الحالات

export type ReportCompletionStatus = 'COMPLETE' | 'PARTIAL' | 'NOT_SUBMITTED' | 'NO_SESSIONS';

export interface ComparisonDelta {
  current: number;
  previous: number;
  delta: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
}

export interface TeacherReportSummary {
  teacher: Teacher;
  date: string; // YYYY-MM-DD
  displayDateArabic: string; // e.g. "الخميس، 17 سبتمبر 2026"
  formattedDateSimple: string; // e.g. "17/09/2026"
  dayName: string; // e.g. "الخميس"
  scheduledCount: number;
  recordedCount: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  unrecordedCount: number;
  attendanceRate: number; // percentage (0 - 100)
  completeRecordsCount: number;
  incompleteRecordsCount: number;
  status: ReportCompletionStatus;
  records: SessionRecord[];
  scheduledSchedules: StudentLessonSchedule[];
}

export interface DayBreakdownItem {
  dayName: string;
  date: string;
  scheduled: number;
  recorded: number;
  present: number;
  absent: number;
  excused: number;
}

export interface TeacherWeeklySummary {
  teacher: Teacher;
  startDate: string;
  endDate: string;
  periodLabel: string;
  scheduledCount: number;
  recordedCount: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
  completeRecordsCount: number;
  incompleteRecordsCount: number;
  evaluatedStudentsCount: number;
  averageStudentScore: number;
  totalHomeworks: number;
  completedHomeworks: number;
  totalValuesGiven: number;
  averageInteraction: string;
  dailyBreakdown: DayBreakdownItem[];
  records: SessionRecord[];
  status: ReportCompletionStatus;
}

export interface StudentWeeklySummary {
  student: Student;
  startDate: string;
  endDate: string;
  periodLabel: string;
  sessionsCount: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
  newHifzAmount: string;
  reviewSummary: string;
  homeworkTotal: number;
  homeworkCompleted: number;
  valuesLearned: string[];
  averageInteraction: string;
  averageDayScore: number;
  progressDelta: number; // score trend from start of week to end
  records: SessionRecord[];
}

export interface TeacherMonthlySummary {
  teacher: Teacher;
  month: string; // YYYY-MM
  monthLabel: string; // e.g. "سبتمبر 2026"
  workingDaysCount: number;
  scheduledCount: number;
  recordedCount: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
  reportCompletenessRate: number;
  studentsCount: number;
  averageStudentPerformance: number;
  averageHifzGrade: number;
  averageReviewGrade: number;
  averageInteraction: string;
  curriculumAppliedCount: number;
  homeworkFollowupRate: number;
  isDataIncomplete: boolean;
  records: SessionRecord[];
}

export interface StudentMonthlySummary {
  student: Student;
  month: string; // YYYY-MM
  monthLabel: string;
  sessionsCount: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  attendanceRate: number;
  newHifzPages: number;
  reviewSummary: string;
  homeworkRate: number;
  valuesCount: number;
  averageInteraction: string;
  monthlyScore: number;
  rank: number;
  achievementsCount: number;
  certificatesCount: number;
  isExemplaryCandidate: boolean;
  records: SessionRecord[];
}

export interface AcademyDailyStats {
  date: string;
  displayDateArabic: string;
  formattedDateSimple: string;
  dayName: string;
  totalTeachers: number;
  activeTeachers: number;
  scheduledSessions: number;
  recordedSessions: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  unrecordedCount: number;
  overallAttendanceRate: number;
  completedReportsCount: number;
  incompleteReportsCount: number;
  notSubmittedReportsCount: number;
  noSessionsCount: number;
}

export interface AcademyPeriodStats {
  periodType: ReportPeriodType;
  startDate: string;
  endDate: string;
  periodLabel: string;
  totalTeachers: number;
  activeTeachers: number;
  totalStudents: number;
  activeStudents: number;
  totalScheduled: number;
  totalRecorded: number;
  totalPresent: number;
  totalAbsent: number;
  totalExcused: number;
  overallAttendanceRate: number;
  averageDayScore: number;
  totalHomeworks: number;
  homeworkCompletionRate: number;
  valuesInstilledCount: number;
  revenue: number;
  expenses: number;
  netProfit: number;
  comparison?: {
    attendanceRateDelta: ComparisonDelta;
    recordedSessionsDelta: ComparisonDelta;
    averageScoreDelta: ComparisonDelta;
  };
}

export type DailyReportViewMode =
  | 'cards'
  | 'table'
  | 'compact'
  | 'byTeacher'
  | 'byStudent'
  | 'print'
  | 'shareCards'
  | 'analytics';

export type DailyReportFilterStatus =
  | 'ALL'
  | 'HAS_REPORT'
  | 'COMPLETE'
  | 'PARTIAL'
  | 'NOT_SUBMITTED'
  | 'ACTIVE'
  | 'INACTIVE';

export type ShareTemplateType = 'classic' | 'modern' | 'achievement' | 'analytics';

export type ShareAspectRatio = '1:1' | '9:16' | '16:9';

export type ShareScope =
  | 'teacher_summary'
  | 'teacher_weekly'
  | 'teacher_monthly'
  | 'academy_daily'
  | 'academy_weekly'
  | 'academy_monthly'
  | 'academy_overview'
  | 'student_summary';
