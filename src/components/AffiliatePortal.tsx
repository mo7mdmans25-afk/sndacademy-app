/**
 * SANAD ACADEMY PLATFORM — FINAL VERSION (1.0)
 * Affiliate Portal (بوابة المسوق المعتمد)
 */

import React, { useState } from 'react';
import { 
  Users, 
  Share2, 
  Copy, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  Award, 
  ExternalLink,
  PhoneCall
} from 'lucide-react';
import { SessionUser, AffiliatePartner, Referral } from '../types';
import { db } from '../services/database';

interface AffiliatePortalProps {
  currentUser: SessionUser;
}

export const AffiliatePortal: React.FC<AffiliatePortalProps> = ({ currentUser }) => {
  const settings = db.getSettings();
  const affiliates = db.getAffiliates();
  const affiliate = affiliates.find(a => a.id === currentUser.refId || a.username === currentUser.username) || affiliates[0];

  const referrals = db.getReferrals().filter(r => r.affiliateId === affiliate.id);
  const [copied, setCopied] = useState(false);

  // Stats
  const totalReferrals = referrals.length;
  const regularStudents = referrals.filter(r => (r.sessionsCount ?? 0) >= 4).length;
  const totalCommission = affiliate.totalCommissions || referrals.reduce((acc, r) => acc + (r.commissionAmount || 0), 0);
  const paidCommission = affiliate.paidCommissions || 0;
  const dueCommission = Math.max(0, totalCommission - paidCommission);

  const referralUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/?ref=${affiliate.code}` 
    : `https://sanad-academy.edu.eg/?ref=${affiliate.code}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = [
      `🌿 *${settings.ACADEMY_NAME}*`,
      `قال رسول الله ﷺ: «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ»`,
      `يسرني دعوتكم للالتحاق بحلقات القرآن الكريم بالسند المتصل وبمنهج تربوي متميز.`,
      `للتسجيل مباشرة عبر الرابط الخاص:`,
      `${referralUrl}`
    ].join('\n');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-right">
      
      {/* Partner Header */}
      <div className="bg-gradient-to-r from-[#0B3B2E] via-[#124B3B] to-[#155A46] text-white p-6 rounded-3xl border border-[#C9A227]/40 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#C9A227] text-[#0B3B2E] flex items-center justify-center font-black text-2xl shadow-inner">
            {affiliate.name.substring(0, 1)}
          </div>
          <div>
            <div className="text-xs text-[#E8D9A6] font-medium">بوابة الشريك التسويقي المعتمد</div>
            <h1 className="text-xl sm:text-2xl font-black text-[#FAF7F0]">{affiliate.name}</h1>
            <div className="text-xs text-gray-300 mt-0.5">
              كود التسويق الخاص: <strong className="font-mono text-[#C9A227] text-sm">{affiliate.code}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-[#C9A227]" /> : <Copy className="w-4 h-4" />}
            {copied ? 'تم النسخ بنجاح' : 'نسخ رابط الإحالة'}
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            مشاركة عبر واتساب
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs text-center">
          <div className="text-xs text-gray-500 font-medium">إجمالي الإحالات</div>
          <div className="text-3xl font-black text-[#0B3B2E] mt-1">{totalReferrals}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">طلب تسجيل عبر كودك</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs text-center">
          <div className="text-xs text-gray-500 font-medium">الطلاب المنتظمون (&gt;= 4 حصص)</div>
          <div className="text-3xl font-black text-emerald-700 mt-1">{regularStudents}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">استحقاق العمولات كاملة</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs text-center">
          <div className="text-xs text-gray-500 font-medium">العمولات المستحقة الحالية</div>
          <div className="text-3xl font-black text-[#C9A227] mt-1">{dueCommission} {settings.CURRENCY}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">جاهزة للصرف</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs text-center">
          <div className="text-xs text-gray-500 font-medium">العمولات المصروفة سابقًا</div>
          <div className="text-3xl font-black text-gray-700 mt-1">{paidCommission} {settings.CURRENCY}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">تم تحويلها لحسابك</div>
        </div>
      </div>

      {/* Referrals Table */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-[#0B3B2E]">سجل الإحالات وحالات التسجيل</h2>
          <span className="text-xs text-gray-500">تحديث فوري عند انتظام الطلاب في الحلقات</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right divide-y divide-gray-200">
            <thead className="bg-[#FAF7F0] text-gray-700 font-bold">
              <tr>
                <th className="p-3">تاريخ الإحالة</th>
                <th className="p-3">الاسم المسجل</th>
                <th className="p-3">النوع</th>
                <th className="p-3">مرحلة المعالجة</th>
                <th className="p-3">الحصص المنفذة</th>
                <th className="p-3">قيمة العمولة</th>
                <th className="p-3">حالة الصرف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {referrals.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-3 font-mono">{r.date}</td>
                  <td className="p-3 font-bold text-gray-900">{r.name}</td>
                  <td className="p-3">{r.type === 'student' ? 'طالب' : 'معلمة'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-800 text-[10px] font-bold rounded-md">
                      {r.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono">{r.sessionsCount} حصص</td>
                  <td className="p-3 font-bold text-[#0B3B2E]">{r.commissionAmount} {settings.CURRENCY}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                      r.paymentStatus === 'مدفوعة' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {r.paymentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
