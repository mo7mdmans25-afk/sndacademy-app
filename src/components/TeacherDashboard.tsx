/**
 * SANAD ACADEMY PLATFORM — FINAL VERSION (1.0)
 * Teacher Dashboard (لوحة المعلمة القرآنية)
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen, 
  Calendar, 
  Clock, 
  CheckCircle, 
  Award, 
  Users, 
  AlertCircle, 
  Save, 
  FileText, 
  Sliders, 
  ChevronDown, 
  Camera, 
  Monitor, 
  Star,
  Sparkles,
  Search,
  Plus
} from 'lucide-react';
import { SessionUser, SessionRecord, Student, Teacher } from '../types';
import { db } from '../services/database';
import { computeDayScore, computeTeacherMonthly } from '../services/evaluations';
import { QURAN_SURAHS, getSurahJuz } from '../services/quranData';
import { syncSingleSession } from '../services/googleSheetsSync';
import { ResourceLibraryView } from './ResourceLibraryView';
import { StudentsDirectoryView } from './StudentsDirectoryView';

interface TeacherDashboardProps {
  currentUser: SessionUser;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ currentUser }) => {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const todayStr = new Date().toISOString().substring(0, 10);
  const settings = db.getSettings();

  // Load teacher record
  const teachers = db.getTeachers();
  const teacher = teachers.find(t => t.id === currentUser.refId || t.name === currentUser.displayName) || teachers[0];

  // Load students assigned to this teacher
  const students = db.getStudents().filter(s => s.teacherId === teacher.id && s.status === 'مستمر');
  
  // Tabs: 'entry' | 'students' | 'records' | 'performance' | 'certRequest' | 'preferences' | 'resources'
  const [activeTab, setActiveTab] = useState<'entry' | 'students' | 'records' | 'performance' | 'certRequest' | 'preferences' | 'resources'>('entry');

  // Unified Record Form State
  const [recordDate, setRecordDate] = useState(todayStr);
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [attendance, setAttendance] = useState<SessionRecord['attendance']>('حاضر');
  const [currentSurah, setCurrentSurah] = useState('الفاتحة');
  const [currentJuz, setCurrentJuz] = useState<number>(1);
  const [newHifz, setNewHifz] = useState('من آية 1 إلى آية 10');
  const [hifzAmount, setHifzAmount] = useState('ربع حزب');
  const [hifzGrade, setHifzGrade] = useState<number>(9.5);
  const [reviewNear, setReviewNear] = useState<number>(9);
  const [reviewFar, setReviewFar] = useState<number>(9);
  const [hifzHomework, setHifzHomework] = useState<SessionRecord['hifzHomework']>('مكتمل');
  const [educationalValue, setEducationalValue] = useState('الصدق والأمانة');
  const [valueHwStatus, setValueHwStatus] = useState<SessionRecord['valueHwStatus']>('مكتمل');
  const [interaction, setInteraction] = useState<SessionRecord['interaction']>('ممتاز');
  const [screenShare, setScreenShare] = useState<SessionRecord['screenShare']>('مستخدمة');
  const [camera, setCamera] = useState<SessionRecord['camera']>('مفتوحة');
  const [parentNotes, setParentNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Selected student entity
  const activeStudent = students.find(s => s.id === selectedStudentId);

  // Auto-sync Surah & Juz when student changes
  const handleStudentChange = (stId: string) => {
    setSelectedStudentId(stId);
    const s = students.find(item => item.id === stId);
    if (s) {
      setCurrentSurah(s.currentSurah || 'الفاتحة');
      setCurrentJuz(s.currentJuz || 1);
      // Camera check for age > 10
      if (s.age > 10) {
        setCamera('غير مطلوبة');
      } else {
        setCamera('مفتوحة');
      }
    }
  };

  // Auto-sync Juz when Surah changes
  const handleSurahChange = (surahName: string) => {
    setCurrentSurah(surahName);
    const surahObj = QURAN_SURAHS.find(s => s.nameArabic === surahName);
    if (surahObj) {
      setCurrentJuz(surahObj.startJuz);
    }
  };

  // Instant Day Score preview
  const liveDayScore = useMemo(() => {
    return computeDayScore({
      attendance,
      hifzGrade,
      reviewNear,
      reviewFar,
      hifzHomework,
      value: educationalValue,
      valueHwStatus,
      interaction,
    });
  }, [attendance, hifzGrade, reviewNear, reviewFar, hifzHomework, educationalValue, valueHwStatus, interaction]);

  // Check duplicate
  const existingRecord = useMemo(() => {
    if (!selectedStudentId || !recordDate) return null;
    return db.getRecords().find(r => r.studentId === selectedStudentId && r.date === recordDate);
  }, [selectedStudentId, recordDate]);

  // Submit unified record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setSaveStatus({ type: 'error', text: 'يرجى اختيار طالب أولاً' });
      return;
    }

    const recordId = existingRecord ? existingRecord.id : `REC-${Date.now()}`;
    const newRecord: SessionRecord = {
      id: recordId,
      date: recordDate,
      teacherId: teacher.id,
      studentId: selectedStudentId,
      attendance,
      surah: currentSurah,
      juz: currentJuz,
      currentSurah,
      currentJuz,
      newMemorization: newHifz === 'حفظ جديد' ? 'نعم' : (newHifz === 'لا' ? 'لا' : 'جزئي'),
      amount: hifzAmount,
      hifzGrade,
      reviewNear,
      reviewFar,
      hifzHomework,
      value: educationalValue,
      valueHomework: 'حفظ ومتابعة الواجب التربوي',
      valueHwStatus,
      interaction,
      screenShare,
      camera: (activeStudent && activeStudent.age > 10) ? 'غير منطبقة' : (camera as any),
      dayScore: liveDayScore,
      notes: parentNotes,
      createdBy: teacher.name,
      createdAt: existingRecord ? existingRecord.createdAt : new Date().toISOString()
    };

    db.saveRecord(newRecord);
    syncSingleSession(newRecord);

    // Update student's current Surah and Juz
    if (activeStudent) {
      activeStudent.currentSurah = currentSurah;
      activeStudent.currentJuz = currentJuz;
      db.saveStudent(activeStudent);
    }

    setSaveStatus({
      type: 'success',
      text: existingRecord 
        ? `تم تحديث جلسة الطالب ${activeStudent?.name} بنجاح (درجة الجلسة: ${liveDayScore}%)` 
        : `تم حفظ الجلسة وتسجيلها رسميًا للطالب ${activeStudent?.name} (درجة الجلسة: ${liveDayScore}%)`
    });

    setTimeout(() => setSaveStatus(null), 5000);
  };

  // Performance calculation for teacher
  const monthlyEval = computeTeacherMonthly(teacher.id, currentMonth);

  // Records filtered
  const [recordSearch, setRecordSearch] = useState('');
  const myRecords = db.getRecords().filter(r => r.teacherId === teacher.id);
  const filteredRecords = myRecords.filter(r => {
    const st = db.getStudents().find(s => s.id === r.studentId);
    return !recordSearch || (st && st.name.includes(recordSearch)) || r.date.includes(recordSearch) || Boolean(r.currentSurah && r.currentSurah.includes(recordSearch));
  }).sort((a, b) => b.date.localeCompare(a.date));

  // Certificate Request state
  const [certStudentId, setCertStudentId] = useState(students[0]?.id || '');
  const [certType, setCertType] = useState('إتمام جزء');
  const [certTitle, setCertTitle] = useState('شهادة إتمام حفظ الجزء الثلاثين (عمّ)');
  const [certMsg, setCertMsg] = useState('');

  const handleRequestCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!certStudentId) return;
    const st = students.find(s => s.id === certStudentId);

    const certId = `REQ-CERT-${Date.now().toString().substring(7)}`;
    db.saveCertificate({
      id: certId,
      serial: certId,
      studentId: certStudentId,
      teacherId: teacher.id,
      certType: certType as any,
      title: certTitle,
      issueDate: todayStr,
      status: 'قيد المراجعة',
      verificationToken: Math.random().toString(36).substring(2, 10).toUpperCase(),
      showTeacherName: true,
      teacherName: teacher.name,
      createdAt: new Date().toISOString()
    });

    db.saveNotification({
      id: `N-${Date.now()}`,
      audience: 'ADMIN',
      type: 'CERTIFICATE',
      title: '🎓 طلب اعتماد شهادة جديد',
      message: `رفعت المعلمة ${teacher.name} طلب اعتماد شهادة (${certTitle}) للطالب ${st?.name}`,
      date: todayStr,
      read: false
    });

    setCertMsg(`تم رفع طلب الشهادة بنجاح لإدارة الأكاديمية للاعتماد والختم.`);
  };

  // Teaching Preferences state
  const [prefMode, setPrefMode] = useState(teacher.teachingMode || 'هجين');
  const [prefMaxStudents, setPrefMaxStudents] = useState(teacher.maxStudents || 15);
  const [prefAgeBands, setPrefAgeBands] = useState<string[]>(teacher.ageGroups || ['5 - 7 سنوات', '8 - 10 سنوات']);
  const [prefSavedMsg, setPrefSavedMsg] = useState(false);

  const handleSavePreferences = () => {
    teacher.teachingMode = prefMode as any;
    teacher.maxStudents = prefMaxStudents;
    teacher.ageGroups = prefAgeBands;
    db.saveTeacher(teacher);
    setPrefSavedMsg(true);
    setTimeout(() => setPrefSavedMsg(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-right">
      
      {/* Teacher Welcome Header */}
      <div className="bg-gradient-to-r from-[#0B3B2E] via-[#124B3B] to-[#155A46] text-white p-6 rounded-3xl border border-[#C9A227]/40 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C9A227] text-[#0B3B2E] flex items-center justify-center font-black text-2xl shadow-inner">
            {teacher.name.substring(0, 1)}
          </div>
          <div>
            <div className="text-xs text-[#E8D9A6] font-medium">بوابة المعلمة القرآنية المعتمدة</div>
            <h1 className="text-xl sm:text-2xl font-black text-[#FAF7F0]">{teacher.name}</h1>
            <div className="text-xs text-gray-300 mt-0.5">
              كود المعلمة: <strong className="font-mono text-[#C9A227]">{teacher.id}</strong> • عدد الطلاب النشطين: {students.length}
            </div>
          </div>
        </div>

        {/* Quick Month KPI summary */}
        <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/15">
          <div className="text-center pl-3 border-l border-white/20">
            <div className="text-[10px] text-gray-300">جلسات هذا الشهر</div>
            <div className="text-lg font-bold text-white">{monthlyEval.recordsCount}</div>
          </div>
          <div className="text-center pl-3 border-l border-white/20">
            <div className="text-[10px] text-gray-300">التقييم الحالي</div>
            <div className="text-lg font-bold text-[#C9A227]">{monthlyEval.score}%</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-gray-300">البونص المتوقع</div>
            <div className="text-lg font-bold text-emerald-300">{monthlyEval.bonus} ج.م</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('entry')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'entry' ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-4 h-4 text-[#C9A227]" />
          نموذج الإدخال الموحد للجلسة
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'students' ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          طلابي ({students.length})
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'records' ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          سجلاتي السابقة ({myRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'performance' ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Award className="w-4 h-4 text-[#C9A227]" />
          أدائي وبونص الشهر
        </button>
        <button
          onClick={() => setActiveTab('certRequest')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'certRequest' ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          طلب شهادة لطالب
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'preferences' ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          رغبات وطاقة التدريس
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'resources' ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          id="teacher-resources-tab-btn"
        >
          <BookOpen className="w-4 h-4 text-[#C9A227]" />
          مكتبة المصادر ورفع المواد (PDF)
        </button>
      </div>

      {/* TAB 1: Unified Session Entry Form */}
      {activeTab === 'entry' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3B2E]">استمارة تسجيل جلسة قرآنية جديدة</h2>
              <p className="text-xs text-gray-500 mt-0.5">تسجيل فوري مع احتساب تلقائي لدرجة الجلسة ومنع التكرار</p>
            </div>
            
            {/* Live Day Score Display */}
            <div className="flex items-center gap-2 px-4 py-2 bg-[#FAF7F0] border-2 border-[#C9A227] rounded-2xl">
              <span className="text-xs text-gray-600 font-bold">درجة الجلسة الفورية:</span>
              <span className="text-xl font-black text-[#0B3B2E]">{liveDayScore}%</span>
            </div>
          </div>

          {/* Feedback message */}
          {saveStatus && (
            <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              saveStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <CheckCircle className="w-4 h-4" />
              <span>{saveStatus.text}</span>
            </div>
          )}

          {/* Duplicate detection warning */}
          {existingRecord && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong>تنبيه:</strong> توجد جلسة مسجلة مسبقًا لهذا الطالب في تاريخ ({recordDate}). عند الحفظ الآن، سيتم <strong>تحديث</strong> الجلسة السابقة بدلاً من إنشاء جلسة مكررة.
              </div>
            </div>
          )}

          <form onSubmit={handleSaveRecord} className="space-y-6">
            
            {/* Basic Info: Date, Student, Attendance */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">تاريخ الجلسة *</label>
                <input
                  type="date"
                  required
                  value={recordDate}
                  onChange={e => setRecordDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#C9A227]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">الطالب *</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={e => handleStudentChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#C9A227]"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id}) — {s.ageGroup}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">حالة الحضور *</label>
                <select
                  value={attendance}
                  onChange={e => setAttendance(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-hidden focus:border-[#C9A227]"
                >
                  <option value="حاضر">حاضر (100%)</option>
                  <option value="متأخر">متأخر (75%)</option>
                  <option value="اعتذار">اعتذار مسبق (50%)</option>
                  <option value="غائب">غائب بدون عذر (0%)</option>
                </select>
              </div>
            </div>

            {/* Quran Position & New Hifz */}
            <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-4">
              <div className="font-bold text-xs text-[#0B3B2E] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#C9A227]" />
                موضع الحفظ الحالي والمقدار الجديد
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">السورة الحالية</label>
                  <select
                    value={currentSurah}
                    onChange={e => handleSurahChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl"
                  >
                    {QURAN_SURAHS.map(s => (
                      <option key={s.number} value={s.nameArabic}>
                        {s.number}. سورة {s.nameArabic}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">الجزء القرآني</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={currentJuz}
                    onChange={e => setCurrentJuz(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">المحفوظ الجديد (الآيات)</label>
                  <input
                    type="text"
                    value={newHifz}
                    onChange={e => setNewHifz(e.target.value)}
                    placeholder="مثال: من آية 1 إلى آية 15"
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">مقدار الحفظ</label>
                  <select
                    value={hifzAmount}
                    onChange={e => setHifzAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl"
                  >
                    <option value="نصف ربع">نصف ربع (ثمن)</option>
                    <option value="ربع حزب">ربع حزب</option>
                    <option value="نصف حزب">نصف حزب</option>
                    <option value="حزب كامل">حزب كامل</option>
                    <option value="أكثر من حزب">أكثر من حزب</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Grades: Hifz, Near Review, Far Review */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700">درجة الحفظ الجديد (من 10)</label>
                  <span className="text-sm font-black text-[#0B3B2E]">{hifzGrade}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={hifzGrade}
                  onChange={e => setHifzGrade(Number(e.target.value))}
                  className="w-full accent-[#0B3B2E]"
                />
              </div>

              <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700">المراجعة القريبة (من 10)</label>
                  <span className="text-sm font-black text-[#0B3B2E]">{reviewNear}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={reviewNear}
                  onChange={e => setReviewNear(Number(e.target.value))}
                  className="w-full accent-[#0B3B2E]"
                />
              </div>

              <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-gray-700">المراجعة البعيدة (من 10)</label>
                  <span className="text-sm font-black text-[#0B3B2E]">{reviewFar}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={reviewFar}
                  onChange={e => setReviewFar(Number(e.target.value))}
                  className="w-full accent-[#0B3B2E]"
                />
              </div>
            </div>

            {/* Homework, Educational Value, Interaction, Technical Setup */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">واجب التسميع والقرآن</label>
                <select
                  value={hifzHomework}
                  onChange={e => setHifzHomework(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl"
                >
                  <option value="مكتمل">مكتمل (100%)</option>
                  <option value="مكتمل جزئيًا">مكتمل جزئيًا (50%)</option>
                  <option value="لم ينفذ">لم ينفذ (0%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">القيمة التربوية المعطاة</label>
                <input
                  type="text"
                  value={educationalValue}
                  onChange={e => setEducationalValue(e.target.value)}
                  placeholder="مثال: الصدق، بر الوالدين، الأمانة"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">واجب القيمة التربوية</label>
                <select
                  value={valueHwStatus}
                  onChange={e => setValueHwStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl"
                >
                  <option value="مكتمل">مكتمل ومطبق (100%)</option>
                  <option value="مكتمل جزئيًا">مطبق جزئيًا (50%)</option>
                  <option value="لم ينفذ">لم يطبق (0%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">التفاعل والتركيز</label>
                <select
                  value={interaction}
                  onChange={e => setInteraction(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl"
                >
                  <option value="ممتاز">ممتاز (100%)</option>
                  <option value="جيد جدًا">جيد جدًا (90%)</option>
                  <option value="جيد">جيد (80%)</option>
                  <option value="متوسط">متوسط (70%)</option>
                  <option value="ضعيف">ضعيف (50%)</option>
                </select>
              </div>
            </div>

            {/* Technical Parameters: Screen Share & Camera */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-[#0B3B2E]" />
                  مشاركة الشاشة والمصحف
                </label>
                <select
                  value={screenShare}
                  onChange={e => setScreenShare(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl"
                >
                  <option value="مستخدمة">مستخدمة طوال الجلسة</option>
                  <option value="غير مستخدمة">غير مستخدمة</option>
                  <option value="غير مطلوبة">غير مطلوبة لهذه الجلسة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#0B3B2E]" />
                  حالة الكاميرا (خاصة بالأطفال حتى سن 10 فقط)
                </label>
                {activeStudent && activeStudent.age > 10 ? (
                  <div className="px-3 py-2 text-xs text-gray-500 bg-gray-100 rounded-xl border border-gray-200">
                    غير مطلوبة نظاميًا (عمر الطالب {activeStudent.age} سنة &gt; 10 سنوات)
                  </div>
                ) : (
                  <select
                    value={camera}
                    onChange={e => setCamera(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-xl"
                  >
                    <option value="مفتوحة">مفتوحة وملتزم</option>
                    <option value="مغلقة">مغلقة</option>
                    <option value="غير مطلوبة">غير مطلوبة</option>
                  </select>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات لولي الأمر (تظهر في تقرير ولي الأمر)</label>
                <textarea
                  rows={2}
                  value={parentNotes}
                  onChange={e => setParentNotes(e.target.value)}
                  placeholder="مثال: أحسنت في إتقان الغنن اليوم، نرجو تدريب أكثر على المد العارض للسكون"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ملاحظات داخلية سرية (للإدارة فقط)</label>
                <textarea
                  rows={2}
                  value={internalNotes}
                  onChange={e => setInternalNotes(e.target.value)}
                  placeholder="ملاحظات لا يراها الطالب أو ولي الأمر"
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3 bg-[#0B3B2E] hover:bg-[#14573F] text-[#E8D9A6] font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4 text-[#C9A227]" />
                {existingRecord ? 'تحديث بيانات الجلسة' : 'حفظ الجلسة واعتماد الدرجة'}
              </button>
            </div>

          </form>

        </div>
      )}

      {/* TAB 2: My Students */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          <StudentsDirectoryView
            currentUser={currentUser}
          />
        </div>
      )}

      {/* TAB 3: Past Records */}
      {activeTab === 'records' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h2 className="text-lg font-bold text-[#0B3B2E]">سجل الجلسات السابقة</h2>
            <div className="relative w-72">
              <input
                type="text"
                placeholder="بحث باسم الطالب أو التاريخ..."
                value={recordSearch}
                onChange={e => setRecordSearch(e.target.value)}
                className="w-full pl-3 pr-9 py-2 text-xs bg-gray-50 border border-gray-300 rounded-xl"
              />
              <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right divide-y divide-gray-200">
              <thead className="bg-[#FAF7F0] text-gray-700 font-bold">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">الطالب</th>
                  <th className="p-3">الحضور</th>
                  <th className="p-3">السورة والجزء</th>
                  <th className="p-3">الحفظ</th>
                  <th className="p-3">م. قريبة</th>
                  <th className="p-3">م. بعيدة</th>
                  <th className="p-3">الدرجة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map(r => {
                  const student = db.getStudents().find(s => s.id === r.studentId);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-3 font-mono">{r.date}</td>
                      <td className="p-3 font-bold text-gray-900">{student ? student.name : r.studentId}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          r.attendance === 'حاضر' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.attendance}
                        </span>
                      </td>
                      <td className="p-3">{r.currentSurah} (ج {r.currentJuz})</td>
                      <td className="p-3 font-mono">{r.hifzGrade}/10</td>
                      <td className="p-3 font-mono">{r.reviewNear}/10</td>
                      <td className="p-3 font-mono">{r.reviewFar}/10</td>
                      <td className="p-3 font-bold text-[#0B3B2E]">{r.dayScore}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Teacher Performance & Monthly Bonus Breakdown */}
      {activeTab === 'performance' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0B3B2E]">تقييم الأداء الشهري والبونص المستحق</h2>
              <p className="text-xs text-gray-500">حساب دقيق وفق المعايير العشرة المعتمدة مع إعادة توزيع الأوزان ديناميكيًا</p>
            </div>
            <span className="px-3 py-1 bg-[#C9A227] text-[#0B3B2E] font-black text-xs rounded-full">
              شهر: {currentMonth}
            </span>
          </div>

          {/* Bonus Status Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0B3B2E] to-[#14573F] text-white">
              <div className="text-xs text-[#E8D9A6] font-medium mb-1">الدرجة الإجمالية الموزونة</div>
              <div className="text-3xl font-black">{monthlyEval.score}%</div>
              <div className="text-xs text-gray-300 mt-2">الرتبة: {monthlyEval.grade}</div>
            </div>

            <div className="p-5 rounded-2xl bg-[#FAF7F0] border-2 border-[#C9A227]">
              <div className="text-xs text-gray-600 font-medium mb-1">مكافأة التميز (البونص)</div>
              <div className="text-3xl font-black text-[#0B3B2E]">{monthlyEval.bonus} <span className="text-sm font-normal">ج.م</span></div>
              <div className="text-xs text-[#A8841C] mt-2 font-semibold">
                {monthlyEval.score >= 90 ? '🏆 الشريحة الأولى (>= 90%)' : monthlyEval.score >= 85 ? '⭐ الشريحة الثانية (>= 85%)' : monthlyEval.score >= 80 ? '✅ الشريحة الثالثة (>= 80%)' : 'يحتاج إلى تحسين (< 80%)'}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200">
              <div className="text-xs text-gray-500 font-medium mb-1">حالة اكتمال البيانات</div>
              <div className="text-base font-bold text-gray-900 mt-1">{monthlyEval.dataStatus}</div>
              <div className="text-xs text-gray-500 mt-2">
                عدد الجلسات المرصودة: {monthlyEval.recordsCount} (الحد الأدنى المطلوب: {settings.MIN_RECORDS})
              </div>
            </div>
          </div>

          {/* Criteria Breakdown Grid */}
          <div>
            <h3 className="font-bold text-sm text-[#0B3B2E] mb-3">تفصيل درجات المعايير والأوزان</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-gray-500">رفع التقارير (10%)</div>
                <div className="font-bold text-gray-900 mt-1">{monthlyEval.reportsScore}%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-gray-500">الحضور والانضباط (10%)</div>
                <div className="font-bold text-gray-900 mt-1">{monthlyEval.attendanceScore}%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-gray-500">متابعة الواجبات (10%)</div>
                <div className="font-bold text-gray-900 mt-1">{monthlyEval.homeworkScore}%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-gray-500">جودة الحفظ (15%)</div>
                <div className="font-bold text-gray-900 mt-1">{monthlyEval.hifzScore}%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-gray-500">جودة المراجعة (15%)</div>
                <div className="font-bold text-gray-900 mt-1">{monthlyEval.reviewScore}%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-gray-500">تقدم الطلاب (15%)</div>
                <div className="font-bold text-gray-900 mt-1">{monthlyEval.progressScore}%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-gray-500">المنهج التربوي (5%)</div>
                <div className="font-bold text-gray-900 mt-1">{monthlyEval.curriculumScore}%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-gray-500">التفاعل والتركيز (5%)</div>
                <div className="font-bold text-gray-900 mt-1">{monthlyEval.interactionScore}%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-gray-500">مشاركة الشاشة (5%)</div>
                <div className="font-bold text-gray-900 mt-1">{monthlyEval.screenScore ?? 'غير مطبقة'}%</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-gray-500">الكاميرا (&lt;= 10 سنوات) (5%)</div>
                <div className="font-bold text-gray-900 mt-1">{monthlyEval.cameraScore !== undefined ? `${monthlyEval.cameraScore}%` : 'مستبعدة للأعمار &gt; 10'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Request Certificate for Student */}
      {activeTab === 'certRequest' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-[#0B3B2E]">طلب اعتماد شهادة إتمام لطالب</h2>
            <p className="text-xs text-gray-500 mt-0.5">يُرفع الطلب مباشرة إلى إدارة الأكاديمية للمراجعة والاعتماد وإصدار الرقم الرسمي</p>
          </div>

          {certMsg && (
            <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-bold">
              {certMsg}
            </div>
          )}

          <form onSubmit={handleRequestCert} className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">اختر الطالب المستحق *</label>
              <select
                required
                value={certStudentId}
                onChange={e => setCertStudentId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">نوع الشهادة *</label>
              <select
                value={certType}
                onChange={e => setCertType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl"
              >
                <option value="إتمام جزء">إتمام جزء قرآني</option>
                <option value="إتمام سورة">إتمام سورة طويلة</option>
                <option value="إتقان تجويد">إتقان أحكام التجويد</option>
                <option value="تميز شهري">شهادة تميز شهرية</option>
                <option value="ختمة كاملة">إتمام الختمة القرآنية</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">عنوان الشهادة المقترح *</label>
              <input
                type="text"
                required
                value={certTitle}
                onChange={e => setCertTitle(e.target.value)}
                placeholder="مثال: شهادة إتمام حفظ وتجويد جزء تبارك"
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0B3B2E] hover:bg-[#14573F] text-white font-bold text-xs rounded-xl shadow-md transition"
            >
              إرسال طلب الشهادة للإدارة
            </button>
          </form>
        </div>
      )}

      {/* TAB 6: Teaching Preferences */}
      {activeTab === 'preferences' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <h2 className="text-lg font-bold text-[#0B3B2E]">رغبات التدريس والطاقة الاستيعابية</h2>
            <p className="text-xs text-gray-500 mt-0.5">تُستخدم هذه التفضيلات في محرك التسكين الآلي وتوزيع الجداول الأسبوعية</p>
          </div>

          {prefSavedMsg && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold">
              تم حفظ رغبات التدريس بنجاح.
            </div>
          )}

          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">نظام التدريس المفضل</label>
              <select
                value={prefMode}
                onChange={e => setPrefMode(e.target.value as 'فردي' | 'مجموعات' | 'هجين')}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl"
              >
                <option value="فردي">فردي فقط (طالب واحد)</option>
                <option value="مجموعات">مجموعات متجانسة فقط</option>
                <option value="هجين">هجين (أقبل الفردي والمجموعات معًا)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">الحد الأقصى لعدد الطلاب المفضل</label>
              <input
                type="number"
                min={1}
                max={40}
                value={prefMaxStudents}
                onChange={e => setPrefMaxStudents(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl"
              />
            </div>

            <button
              onClick={handleSavePreferences}
              className="px-6 py-2.5 bg-[#0B3B2E] text-[#E8D9A6] font-bold text-xs rounded-xl shadow-md hover:bg-[#14573F] transition"
            >
              حفظ التفضيلات
            </button>
          </div>
        </div>
      )}

      {/* TAB 7: Resource Library (مكتبة المصادر ورفع المواد والملفات) */}
      {activeTab === 'resources' && (
        <ResourceLibraryView currentUser={currentUser} />
      )}

    </div>
  );
};
