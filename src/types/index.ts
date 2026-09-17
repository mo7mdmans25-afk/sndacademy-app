/**
 * SANAD ACADEMY PLATFORM — FINAL VERSION (1.0)
 * Data Model & TypeScript Definitions
 * شعار الأكاديمية: نَجُودُ بِالعِلْمِ .. وَنَصِلُ السَّنَدَ .. وَنَبْنِي الأَثَرَ
 */

export type UserRole = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'AFFILIATE';

export type AdminSubRole = 'SUPER_ADMIN' | 'ACADEMY_ADMIN' | 'ACADEMIC_SUPERVISOR' | 'FINANCE_ADMIN' | 'CONTENT_ADMIN';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  subRole?: AdminSubRole;
  refId: string; // Teacher ID, Student ID, Parent ID, or Affiliate ID
  displayName: string;
  passwordHash: string;
  salt: string;
  status: 'نشط' | 'موقوف';
  createdAt: string;
  lastLogin?: string;
  phone?: string;
  email?: string;
  mustChangePassword?: boolean;
}

export interface SessionUser {
  id: string;
  username: string;
  role: UserRole;
  subRole?: AdminSubRole;
  refId: string;
  displayName: string;
  status: 'نشط' | 'موقوف';
}

export interface Teacher {
  id: string;
  name: string;
  phone: string;
  status: 'نشطة' | 'إجازة' | 'غير نشطة';
  capacity: number;
  joinDate: string;
  notes?: string;
  teachingMode?: 'فردي' | 'مجموعات' | 'هجين';
  ageGroups?: string[];
  minStudents?: number;
  maxStudents?: number;
}

export interface Student {
  id: string;
  name: string;
  username?: string;
  age: number;
  ageGroup: string;
  teacherId: string;
  circleType: 'فردي' | 'مجموعة';
  level: 'تأسيسي' | 'مبتدئ' | 'متوسط' | 'متقدم' | 'متميز';
  currentSurah: string;
  currentJuz: number;
  oldMastery: 'ممتاز' | 'جيد جدًا' | 'جيد' | 'متوسط' | 'ضعيف';
  memorizationSpeed: 'سريعة' | 'جيدة' | 'متوسطة' | 'بطيئة';
  phone: string;
  joinDate: string;
  status: 'مستمر' | 'متوقف';
  photoUrl?: string;
  publicConsent: 'نعم' | 'لا';
  photoConsent: 'Approved' | 'Pending' | 'Rejected';
  notes?: string;
  modePreference?: 'أرغب في الفردي' | 'أرغب في مجموعة' | 'أرغب في نظام هجين' | 'لا أعرف';
  feePlan?: string;
  country?: string;
  nationality?: string;
  email?: string;
  cardIssueDate?: string;
  approvedGroup?: string;
}

export interface Parent {
  id: string;
  name: string;
  username: string;
  phone: string;
  email?: string;
  status: 'نشط' | 'موقوف';
  createdAt: string;
  studentIds: string[];
}

export interface SessionRecord {
  id: string;
  date: string; // YYYY-MM-DD
  teacherId: string;
  studentId: string;
  surah: string;
  juz: number;
  currentSurah?: string;
  currentJuz?: number;
  newHifz?: string;
  attendance: 'حاضر' | 'متأخر' | 'اعتذار' | 'غائب';
  newMemorization: 'نعم' | 'جزئي' | 'لا';
  amount: string;
  hifzGrade: number; // 1-10
  reviewNear: number; // 1-10
  reviewFar: number; // 1-10
  hifzHomework: 'مكتمل' | 'مكتمل جزئيًا' | 'لم ينفذ';
  value: string;
  valueHomework: string;
  valueHwStatus: 'مكتمل' | 'جزئي' | 'لم ينفذ';
  interaction: 'ممتاز' | 'جيد جدًا' | 'جيد' | 'متوسط' | 'ضعيف';
  screenShare: 'ممتازة' | 'جيدة' | 'متوسطة' | 'غير مطلوبة' | 'مستخدمة' | 'غير مستخدمة';
  camera: 'مفتوحة' | 'مغلقة' | 'غير منطبقة' | 'غير مطلوبة';
  dayScore: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface StudentMonthlyScore {
  studentId: string;
  month: string; // YYYY-MM
  sessions: number;
  attendanceRate: number; // %
  hifzAverage: number; // 1-10
  reviewAverage: number; // 1-10
  homeworkRate: number; // %
  valueRate: number; // %
  valueHwRate: number; // %
  interactionRate: number; // %
  progressScore: number; // %
  score: number; // 0-100
  grade: '🌟 متميز' | '⭐ متقدم' | '✅ جيد' | '⚠️ يحتاج متابعة' | 'بيانات غير مكتملة';
  isComplete: boolean;
}

export interface TeacherMonthlyEvaluation {
  teacherId: string;
  month: string; // YYYY-MM
  recordsCount: number;
  studentsCount: number;
  reportsScore: number;
  attendanceScore: number;
  homeworkScore: number;
  hifzScore: number;
  reviewScore: number;
  progressScore: number;
  curriculumScore: number;
  interactionScore: number;
  screenScore?: number;
  cameraScore?: number;
  appliedWeights: number;
  score: number;
  grade: '🏆 متميزة' | '⭐ متقدمة' | '✅ جيدة' | '⚠️ تحتاج متابعة' | '—';
  bonus: number;
  dataStatus: 'مكتملة' | '⚠️ بيانات غير مكتملة' | 'لا توجد سجلات';
}

export interface PlacementAnalysis {
  studentId: string;
  name: string;
  age: number;
  ageGroup: string;
  level: string;
  currentSurah: string;
  juz: number;
  oldMastery: string;
  speed: string;
  nearReviewScore: number;
  farReviewScore: number;
  attendanceRate: number;
  progressScore: number;
  interactionScore: number;
  homeworkScore: number;
  preference: string;
  currentTeacher: string;
  compatibilityIndex: number; // 0-100%
  compatibilityReasons: string[];
  suggestedGroup: string;
  suggestReason: string;
  willingTeachers: string[];
  approvedGroup?: string;
}

export interface EducationalItem {
  id: string;
  ageGroup: '5 - 7 سنوات' | '8 - 10 سنوات' | '11 - 13 سنة' | '14 - 17 سنة' | '18 سنة فأكثر';
  category: 'قصص قرآنية' | 'قصص تربوية' | 'السيرة' | 'الآداب' | 'القيم' | 'حديث شريف' | 'تدبر' | 'أنشطة وتحديات' | 'مهارات شخصية';
  title: string;
  value: string;
  goal: string;
  story?: string;
  activity?: string;
  skill?: string;
  homework: string;
  interactionGuide?: string;
  followupGuide?: string;
  mediaType?: 'text' | 'image' | 'pdf' | 'audio' | 'video' | 'link';
  mediaUrl?: string;
  status: 'Draft' | 'Pending Review' | 'Published' | 'Archived';
  displayOrder: number;
  author: string;
  createdAt: string;
}

export interface HomeworkAssignment {
  id: string;
  studentId: string;
  teacherId: string;
  educationalItemId?: string;
  title: string;
  instructions: string;
  dueDate: string;
  status: 'Not Started' | 'In Progress' | 'Submitted' | 'Under Review' | 'Approved' | 'Needs Redo' | 'Rejected' | 'Completed';
  submissionType?: 'text' | 'file' | 'audio' | 'link';
  submissionContent?: string;
  submissionDate?: string;
  teacherFeedback?: string;
  grade?: number;
  createdAt: string;
}

export interface Certificate {
  id: string;
  studentId: string;
  certType: string;
  title: string;
  issueDate: string;
  status: 'مسودة' | 'قيد المراجعة' | 'معتمدة' | 'مصدرة' | 'ملغاة' | 'معطلة' | 'مُعاد إصدارها';
  serial: string;
  verificationToken: string;
  qrData?: string;
  teacherName?: string;
  teacherId?: string;
  bodyText?: string;
  approvedBy?: string;
  approvedAt?: string;
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;
  version?: number;
  parentCertId?: string;
  showTeacherName?: boolean;
  showStudentPhoto?: boolean;
  createdAt?: string;
}

export interface Ijazah {
  id: string;
  studentId: string;
  ijazahType: string;
  riwayah: string;
  issuer: string;
  sanadText?: string;
  issueDate: string;
  status: 'مسودة' | 'قيد المراجعة' | 'معتمدة' | 'مصدرة' | 'ملغاة' | 'معطلة' | 'مُعاد إصدارها';
  verificationToken: string;
  qrData?: string;
  approvedBy?: string;
  approvedAt?: string;
  notes?: string;
  version?: number;
  parentIjazahId?: string;
  createdAt?: string;
}

export interface CaseItem {
  id: string;
  category?: 'حضور' | 'طالب' | 'معلمة' | 'مالية' | 'شهادات' | 'تسجيل' | 'تسكين' | 'تسويق' | 'أخرى';
  caseType?: string;
  title?: string;
  type?: string;
  severity: 'عالية' | 'متوسطة' | 'عادية' | 'حرجة' | 'طبيعية';
  studentId?: string;
  teacherId?: string;
  parentId?: string;
  description: string;
  responsible?: string;
  assignedStaff?: string;
  delegatedTo?: string;
  delegatedBy?: string;
  delegationDate?: string;
  instructions?: string;
  actionTaken?: string;
  resultDetails?: string;
  finalDecision?: string;
  status: 'مفتوحة' | 'قيد المعالجة' | 'بانتظار معلومات' | 'بانتظار اعتماد' | 'تمت المعالجة' | 'مغلقة' | 'مرفوضة' | 'مصعّدة' | 'جديدة' | 'مفوضة';
  createdDate?: string;
  createdBy?: string;
  resolutionDate?: string;
  closedAt?: string;
  notes?: string;
  source?: 'يدوي' | 'تلقائي';
}

export interface CaseActionLog {
  id: string;
  caseId: string;
  date: string;
  by: string;
  action: string;
  result?: string;
  notes?: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  month: string; // YYYY-MM
  monthlyFee: number;
  discount: number;
  netFee: number;
  amount?: number;
  dueDate: string;
  status: 'مدفوع' | 'مدفوع جزئيًا' | 'متأخر' | 'غير مدفوع' | 'إعفاء';
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  studentId: string;
  feeId: string;
  amount: number;
  date: string;
  method: 'نقدًا' | 'تحويل بنكي' | 'محفظة إلكترونية' | 'إنستاباي' | string;
  receiptNumber?: string;
  status?: string;
  recordedBy: string;
  notes?: string;
}

export interface PayrollRecord {
  id: string;
  teacherId: string;
  month: string; // YYYY-MM
  sessionsCount: number;
  baseSalary: number;
  extraAmount: number;
  deductions: number;
  bonusAmount: number;
  netSalary: number;
  status: 'مستحق' | 'قيد المراجعة' | 'معتمد' | 'تم الصرف' | 'مؤجل' | 'ملغى';
  paidDate?: string;
  paymentMethod?: string;
  approvedBy?: string;
  notes?: string;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: 'رواتب' | 'بونص' | 'عمولات تسويق' | 'تكريم' | 'حوافز' | 'إدارة' | 'مشرفون' | 'أنشطة' | 'اشتراكات وأدوات' | 'تقنية' | 'أخرى';
  beneficiary?: string;
  recipient?: string;
  description: string;
  amount: number;
  paymentMethod?: string;
  approvedBy?: string;
  recordedBy?: string;
  notes?: string;
}

export interface Affiliate {
  id: string;
  name: string;
  username?: string;
  phone: string;
  email?: string;
  code: string;
  status: 'نشط' | 'موقوف';
  joinDate: string;
  userId?: string;
  notes?: string;
  totalReferrals?: number;
  convertedCount?: number;
  totalCommissions?: number;
  paidCommissions?: number;
}

export interface ReferralRecord {
  id: string;
  affiliateId: string;
  affiliateCode: string;
  referralType?: 'student' | 'teacher';
  type?: 'student' | 'teacher';
  name?: string;
  personName: string;
  personId?: string;
  country: string;
  date: string;
  accepted?: boolean;
  paid?: boolean;
  placed?: boolean;
  started?: boolean;
  regular?: boolean;
  sessionsCount?: number;
  commissionAmount?: number;
  paymentStatus?: string;
  status: 'Pending' | 'Eligible' | 'Approved' | 'Rejected' | 'Paid' | string;
  notes?: string;
}

export type FinancialFee = FeeRecord;
export type FinancialPayment = PaymentRecord;
export type AcademyExpense = ExpenseRecord;
export type AcademicCase = CaseItem;
export type RegistrationSubmission = RegistrationRequest;
export type AffiliatePartner = Affiliate;
export type CurriculumItem = EducationalItem;
export type Referral = ReferralRecord;

export interface CommissionRecord {
  id: string;
  referralId: string;
  affiliateId: string;
  type: 'student' | 'teacher';
  amount: number;
  currency: string;
  status: 'Eligible' | 'Approved' | 'Paid' | 'Rejected' | 'Cancelled';
  eligibleDate: string;
  approvedBy?: string;
  approvedDate?: string;
  paidDate?: string;
  rejectReason?: string;
}

export interface RegistrationRequest {
  id: string;
  type: 'student' | 'teacher';
  name: string;
  phone: string;
  email?: string;
  dob?: string;
  age?: number;
  country: string;
  nationality?: string;
  level?: string;
  surah?: string;
  juz?: number;
  preference?: string;
  feePlan?: string;
  qualification?: string;
  experience?: string;
  availability?: string;
  teachingMode?: string;
  source: string;
  affiliateCode?: string;
  date: string;
  status: 'New' | 'Under Review' | 'Approved' | 'Rejected' | 'Need More Info';
  reviewedBy?: string;
  assignedId?: string;
  notes?: string;
}

export interface NotificationItem {
  id: string;
  audience: 'ALL' | 'ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT' | 'AFFILIATE';
  targetId?: string; // Specific User ID or Student/Teacher ID
  userId?: string;
  type: 'REGISTRATION' | 'HOMEWORK' | 'ATTENDANCE' | 'CERTIFICATE' | 'IJAZAH' | 'CASE' | 'PAYMENT' | 'GENERAL' | 'ANNOUNCEMENT' | 'MESSAGE' | 'LESSON' | 'EVALUATION' | 'ALERT';
  title: string;
  message: string;
  date: string;
  time?: string;
  read: boolean;
  link?: string;
  senderName?: string;
  relatedEntity?: 'CONVERSATION' | 'LESSON' | 'HOMEWORK' | 'CERTIFICATE' | 'EVALUATION' | 'STUDENT' | 'CASE';
  relatedEntityId?: string;
  studentId?: string;
  studentName?: string;
  eventId?: string; // For deduplication EVENT_TYPE_EVENT_ID_USER_ID
  status?: 'Unread' | 'Read';
  createdAt?: string;
}

export interface NotificationPreferences {
  userId: string;
  newMessages: boolean;
  lessonReminders: boolean;
  homeworkUpdates: boolean;
  evaluations: boolean;
  certificates: boolean;
  announcements: boolean;
  absenceAlerts: boolean;
  importantAlerts: boolean;
  browserPush: boolean;
  reminderLead24h: boolean;
  reminderLead1h: boolean;
  reminderLead10m: boolean;
}

export interface StudentLessonSchedule {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  circleType: 'فردي' | 'مجموعة';
  category?: string;
  days: string[]; // e.g. ['الأحد', 'الثلاثاء', 'الخميس']
  time: string; // e.g. '17:00'
  durationMinutes: number; // e.g. 45
  timezone: string; // e.g. 'Africa/Cairo'
  status: 'نشط' | 'معلق' | 'ملغى';
  meetingUrl?: string;
  meetingLink?: string;
  notes?: string;
  lastUpdated?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  recipientId?: string;
  recipientName?: string;
  text: string;
  timestamp: string;
  timeFormatted: string;
  read: boolean;
  isUrgent?: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentType?: 'image' | 'pdf' | 'audio' | 'file';
  requestId?: string;
}

export interface ChatConversation {
  id: string;
  type: 'DIRECT' | 'BROADCAST' | 'GROUP';
  title: string;
  participants: {
    id: string;
    name: string;
    role: UserRole;
  }[];
  lastMessage?: string;
  lastTimestamp?: string;
  unreadCount?: number;
  createdAt: string;
}

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
}

export interface PlatformSettings {
  ACADEMY_NAME: string;
  ACADEMY_MOTTO: string;
  ACADEMY_LOGO_URL: string;
  CERT_PREFIX: string;
  IJAZAH_PREFIX: string;
  CURRENCY: string;
  CURRENCY_CODE: string;
  DEFAULT_LANG: string;
  PUBLIC_DASHBOARD: 'ON' | 'OFF';
  SHOW_STUDENT_OF_MONTH: 'ON' | 'OFF';
  SHOW_STUDENT_NAME: 'ON' | 'OFF';
  SHOW_STUDENT_PHOTO: 'ON' | 'OFF';
  SHOW_ACADEMY_STATISTICS: 'ON' | 'OFF';
  SHOW_CERTIFICATE_COUNT: 'ON' | 'OFF';
  SHOW_IJAZAH_COUNT: 'ON' | 'OFF';
  SHOW_ACHIEVEMENTS: 'ON' | 'OFF';
  SHOW_TEACHER_NAME_CERT: 'نعم' | 'لا';
  SHOW_STUDENT_PHOTO_CERT: 'نعم' | 'لا';
  SW_ATT: number;
  SW_HFZ: number;
  SW_REV: number;
  SW_HW: number;
  SW_PRG: number;
  SW_VAL: number;
  SW_VHW: number;
  SW_INT: number;
  TW_REP: number;
  TW_ATT: number;
  TW_HW: number;
  TW_HFZ: number;
  TW_REV: number;
  TW_PRG: number;
  TW_TRB: number;
  TW_INT: number;
  TW_SCR: number;
  TW_CAM: number;
  GRADE_EXCELLENT: number;
  GRADE_ADVANCED: number;
  GRADE_GOOD: number;
  BONUS_P1: number;
  BONUS_P2: number;
  BONUS_P3: number;
  BONUS_V1: number;
  BONUS_V2: number;
  BONUS_V3: number;
  MIN_RECORDS: number;
  EXPECTED_SESSIONS: number;
  MIN_ATTENDANCE: number;
  WINNERS_COUNT: number;
  PRIZE_VALUE: number;
  AFF_STUDENT_EG: number;
  AFF_STUDENT_INT: number;
  AFF_TEACHER: number;
  AFF_REGULARITY_SESSIONS: number;
  SALARY_BASE: number;
  SALARY_PER_SESSION: number;
  GRP_MIN: number;
  GRP_MAX: number;
  GOOGLE_SHEET_WEBHOOK_URL?: string;
  GOOGLE_SHEET_AUTO_SYNC?: 'ON' | 'OFF';
  GOOGLE_SHEET_LAST_SYNC?: string;
}

export interface QuranSurah {
  number: number;
  nameArabic: string;
  nameEnglish: string;
  ayahCount: number;
  revelationType: 'Meccan' | 'Medinan';
  startJuz: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type ResourceCategory = 
  | 'مصحف وتفاسير' 
  | 'تجويد وأحكام' 
  | 'متون وقراءات' 
  | 'واجبات ومذكرات' 
  | 'روابط ومحاضرات';

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  type: 'pdf' | 'link' | 'image' | 'file';
  url: string; // link or base64 data url
  fileName?: string;
  fileSize?: string;
  uploaderId: string;
  uploaderName: string;
  uploaderRole: 'TEACHER' | 'ADMIN';
  targetAudience: 'ALL' | 'STUDENT' | 'TEACHER';
  createdAt: string;
  downloadsCount: number;
}

