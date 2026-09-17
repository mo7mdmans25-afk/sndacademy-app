/**
 * SANAD ACADEMY PLATFORM — FINAL VERSION (1.0)
 * Parent Portal (بوابة ولي الأمر)
 */

import React, { useState } from 'react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  CreditCard, 
  FileText, 
  Printer, 
  Award, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Share2,
  Download
} from 'lucide-react';
import { SessionUser, Student } from '../types';
import { db } from '../services/database';
import { computeStudentMonthly } from '../services/evaluations';

interface ParentPortalProps {
  currentUser: SessionUser;
  onOpenVerifyWithId: (id: string) => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({ currentUser, onOpenVerifyWithId }) => {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const settings = db.getSettings();

  // Find parent record
  const parents = db.getParents();
  const parent = parents.find(p => p.id === currentUser.refId || p.username === currentUser.username) || parents[0];

  // Find all children belonging to this parent
  const allStudents = db.getStudents();
  const children = allStudents.filter(s => parent.studentIds?.includes(s.id));
  const activeChildren = children.length > 0 ? children : [allStudents[0]];

  // Selected child state
  const [selectedChildId, setSelectedChildId] = useState<string>(activeChildren[0]?.id || '');
  const child = activeChildren.find(c => c.id === selectedChildId) || activeChildren[0];
  const teacher = db.getTeachers().find(t => t.id === child?.teacherId);

  // Child data
  const monthly = computeStudentMonthly(child?.id || '', currentMonth);
  const records = db.getRecords().filter(r => r.studentId === child?.id).sort((a, b) => b.date.localeCompare(a.date));
  const certs = db.getCertificates().filter(c => c.studentId === child?.id && ['مصدرة', 'معتمدة'].includes(c.status));

  // Child Finance
  const childFees = db.getFees().filter(f => f.studentId === child?.id);
  const childPayments = db.getPayments().filter(p => p.studentId === child?.id);
  const totalFeesDue = childFees.reduce((acc, f) => acc + (f.amount || 0), 0);
  const totalFeesPaid = childPayments.reduce((acc, p) => acc + p.amount, 0);
  const remainingBalance = Math.max(0, totalFeesDue - totalFeesPaid);

  const [activeTab, setActiveTab] = useState<'report' | 'sessions' | 'finance' | 'certificates'>('report');

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-right">
      
      {/* Parent Header */}
      <div className="bg-gradient-to-r from-[#0B3B2E] via-[#124B3B] to-[#155A46] text-white p-6 rounded-3xl border border-[#C9A227]/40 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C9A227] text-[#0B3B2E] flex items-center justify-center font-black text-2xl shadow-inner">
            {parent.name.substring(0, 1)}
          </div>
          <div>
            <div className="text-xs text-[#E8D9A6] font-medium">بوابة المتابعة الأسرية لأولياء الأمور</div>
            <h1 className="text-xl sm:text-2xl font-black text-[#FAF7F0]">{parent.name}</h1>
            <div className="text-xs text-gray-300 mt-0.5">
              رقم الهاتف المسجل: <span className="font-mono">{parent.phone}</span> • عدد الأبناء المسجلين: {activeChildren.length}
            </div>
          </div>
        </div>

        {/* Multi-Child Selector Tabs */}
        {activeChildren.length > 1 && (
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20">
            <span className="text-xs text-gray-200 px-2 font-bold">الأبناء:</span>
            {activeChildren.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedChildId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  selectedChildId === c.id
                    ? 'bg-[#C9A227] text-[#0B3B2E] shadow-sm'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'report' ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-4 h-4 text-[#C9A227]" />
          التقرير الشهري المعتمد
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'sessions' ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          سجل الحصص والملاحظات ({records.length})
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'finance' ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          الحساب المالي والاشتراك
        </button>
        <button
          onClick={() => setActiveTab('certificates')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'certificates' ? 'bg-[#0B3B2E] text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Award className="w-4 h-4 text-[#C9A227]" />
          الشهادات والإنجازات ({certs.length})
        </button>
      </div>

      {/* TAB 1: Official Printable Monthly Report */}
      {activeTab === 'report' && (
        <div className="space-y-6">
          
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-200">
            <div>
              <span className="text-xs text-gray-500">تقرير الأداء الشهري للطالب: </span>
              <strong className="text-sm font-bold text-[#0B3B2E]">{child.name}</strong>
            </div>
            <button
              onClick={handlePrintReport}
              className="px-4 py-2 bg-[#0B3B2E] hover:bg-[#14573F] text-white font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#C9A227]" />
              طباعة / حفظ PDF
            </button>
          </div>

          {/* Report Paper */}
          <div id="monthly-report-paper" className="bg-white p-8 rounded-3xl border-2 border-[#C9A227]/30 shadow-md space-y-6">
            
            {/* Header of Report */}
            <div className="flex justify-between items-center border-b-2 border-[#0B3B2E] pb-4">
              <div>
                <h2 className="text-xl font-black text-[#0B3B2E]">{settings.ACADEMY_NAME}</h2>
                <div className="text-xs text-[#A8841C] font-semibold mt-0.5">{settings.ACADEMY_MOTTO}</div>
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-gray-500">تقرير شهري معتمد</div>
                <div className="text-sm font-mono font-bold text-[#0B3B2E]">{currentMonth}</div>
              </div>
            </div>

            {/* Child & Teacher Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-500">اسم الطالب:</span>
                <div className="font-bold text-gray-900 mt-0.5">{child.name}</div>
              </div>
              <div>
                <span className="text-gray-500">المعلمة المشرفة:</span>
                <div className="font-bold text-gray-900 mt-0.5">{teacher ? teacher.name : '—'}</div>
              </div>
              <div>
                <span className="text-gray-500">السورة الحالية:</span>
                <div className="font-bold text-[#0B3B2E] mt-0.5">{child.currentSurah} (الجزء {child.currentJuz})</div>
              </div>
              <div>
                <span className="text-gray-500">التقييم العام:</span>
                <div className="font-bold text-[#C9A227] mt-0.5">{monthly.grade} ({monthly.score}%)</div>
              </div>
            </div>

            {/* Main Evaluation Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-gray-200 text-center">
                <div className="text-xs text-gray-500">نسبة الحضور</div>
                <div className="text-2xl font-black text-[#0B3B2E] mt-1">{monthly.attendanceRate}%</div>
                <div className="text-[10px] text-gray-400 mt-1">{monthly.sessions} حصة مرصودة</div>
              </div>

              <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-gray-200 text-center">
                <div className="text-xs text-gray-500">معدل الحفظ الجديد</div>
                <div className="text-2xl font-black text-[#0B3B2E] mt-1">{monthly.hifzAverage} / 10</div>
                <div className="text-[10px] text-gray-400 mt-1">إتقان الأحكام والضبط</div>
              </div>

              <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-gray-200 text-center">
                <div className="text-xs text-gray-500">معدل المراجعة المتراكمة</div>
                <div className="text-2xl font-black text-[#0B3B2E] mt-1">{monthly.reviewAverage} / 10</div>
                <div className="text-[10px] text-gray-400 mt-1">القريبة والبعيدة</div>
              </div>

              <div className="p-4 bg-[#FAF7F0] rounded-2xl border border-gray-200 text-center">
                <div className="text-xs text-gray-500">إنجاز الواجبات التربوية</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">{monthly.valueHwRate}%</div>
                <div className="text-[10px] text-gray-400 mt-1">تطبيق القيم عمليًا</div>
              </div>
            </div>

            {/* Teacher Remarks & Recommendations */}
            <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs leading-relaxed space-y-2">
              <h4 className="font-bold text-emerald-950 text-sm">توجيهات المعلمة وتوصيات المتابعة المنزلية:</h4>
              <p className="text-emerald-900">
                {records[0]?.notes 
                  ? records[0].notes 
                  : 'الطالب ملتزم بالحفظ بفضل الله، نوصي بمواصلة الاستماع اليومي إلى المصحف المرتل برواية حفص وتكرار آيات المراجعة البعيدة قبل موعد الحلقة.'}
              </p>
            </div>

            {/* Academy Seal */}
            <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-[11px] text-gray-500">
              <div>حرر إلكترونيًا بواسطة منصة أكاديمية السند المتصل</div>
              <div className="font-bold text-[#0B3B2E]">ختم الإدارة والشؤون التعليمية ✓</div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: Sessions */}
      {activeTab === 'sessions' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-[#0B3B2E]">سجل الحصص والملاحظات اليومية</h2>

          <div className="divide-y divide-gray-100">
            {records.map(r => (
              <div key={r.id} className="py-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="font-bold text-xs text-[#0B3B2E]">
                    {r.date} • سورة {r.currentSurah} (الجزء {r.currentJuz})
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    r.attendance === 'حاضر' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {r.attendance}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl">
                  <div>الحفظ: <strong>{r.hifzGrade}/10</strong></div>
                  <div>مراجعة قريبة: <strong>{r.reviewNear}/10</strong></div>
                  <div>مراجعة بعيدة: <strong>{r.reviewFar}/10</strong></div>
                  <div>درجة الحصة: <strong className="text-[#0B3B2E]">{r.dayScore}%</strong></div>
                </div>

                {r.notes && (
                  <div className="text-xs text-gray-700 bg-[#FAF7F0] p-2.5 rounded-xl border border-[#C9A227]/20">
                    <strong>ملاحظة المعلمة:</strong> {r.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Finance */}
      {activeTab === 'finance' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-xs space-y-6">
          <h2 className="text-lg font-bold text-[#0B3B2E]">كشف الحساب المالي ورسوم الاشتراك</h2>

          {/* Summary Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200">
              <div className="text-xs text-gray-500">إجمالي الرسوم المستحقة</div>
              <div className="text-2xl font-black text-gray-900 mt-1">{totalFeesDue} {settings.CURRENCY}</div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <div className="text-xs text-emerald-700">إجمالي المدفوعات المسددة</div>
              <div className="text-2xl font-black text-emerald-900 mt-1">{totalFeesPaid} {settings.CURRENCY}</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <div className="text-xs text-amber-700">المبلغ المتبقي</div>
              <div className="text-2xl font-black text-amber-900 mt-1">{remainingBalance} {settings.CURRENCY}</div>
            </div>
          </div>

          {/* Payments log */}
          <div>
            <h3 className="font-bold text-sm text-[#0B3B2E] mb-3">سجل إيصالات السداد الرسمية</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right divide-y divide-gray-200">
                <thead className="bg-[#FAF7F0] text-gray-700 font-bold">
                  <tr>
                    <th className="p-3">رقم الإيصال</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">طريقة الدفع</th>
                    <th className="p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {childPayments.map(p => (
                    <tr key={p.id}>
                      <td className="p-3 font-mono font-bold text-[#0B3B2E]">{p.receiptNumber}</td>
                      <td className="p-3 font-mono">{p.date}</td>
                      <td className="p-3 font-bold">{p.amount} {settings.CURRENCY}</td>
                      <td className="p-3">{p.method}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Certificates */}
      {activeTab === 'certificates' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-[#0B3B2E]">شهادات الطالب المعتمدة</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certs.map(c => (
              <div key={c.id} className="p-5 rounded-2xl bg-[#FAF7F0] border-2 border-[#C9A227]/40 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-[#0B3B2E] text-white rounded-md">شهادة إتمام</span>
                    <h3 className="font-bold text-sm text-[#0B3B2E] mt-1">{c.title}</h3>
                  </div>
                  <Award className="w-6 h-6 text-[#C9A227]" />
                </div>
                <div className="text-xs text-gray-600 font-mono">رقم القيد: {c.id}</div>
                <button
                  onClick={() => onOpenVerifyWithId(c.id)}
                  className="text-xs font-bold text-[#0B3B2E] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  التحقق من صحة الوثيقة برمز QR
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
