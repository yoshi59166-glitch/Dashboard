import React, { useState } from 'react';
import { 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Calendar, 
  Award, 
  Mail, 
  Copy, 
  Check, 
  Info,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { 
  Course, 
  Session, 
  WeeklyTrend, 
  StudentOverallStats 
} from '../types';

interface DashboardViewProps {
  course: Course;
  sessions: Session[];
  trends: WeeklyTrend[];
  lowestWeek: WeeklyTrend | null;
  studentStats: StudentOverallStats[];
  onSelectSession: (session: Session) => void;
  onNavigateToRollCall: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  course,
  sessions,
  trends,
  lowestWeek,
  studentStats,
  onSelectSession,
  onNavigateToRollCall,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTooltipIndex, setActiveTooltipIndex] = useState<number | null>(null);

  // Groups counts
  const normalCount = studentStats.filter(s => s.statusGroup === 'normal').length;
  const warningCount = studentStats.filter(s => s.statusGroup === 'warning').length;
  const criticalCount = studentStats.filter(s => s.statusGroup === 'critical').length;
  const consecutiveAlerts = studentStats.filter(s => s.hasConsecutiveAbsenceAlert);

  // Overall average attendance
  const averageAttendance = trends.length > 0
    ? Math.round(trends.reduce((acc, t) => acc + t.attendanceRate, 0) / trends.length)
    : 0;

  // Top participants
  const topParticipants = [...studentStats]
    .sort((a, b) => b.totalParticipationScore - a.totalParticipationScore)
    .slice(0, 5);

  const handleCopyNotice = (student: StudentOverallStats) => {
    const text = `เรียน คุณ${student.student.name} (รหัส ${student.student.studentCode})\nตามที่อาจารย์ได้ตรวจสอบการเข้าเรียนในรายวิชา ${course.code} ${course.name} พบว่าคุณได้ขาดเรียนติดต่อกัน ${student.consecutiveAbsences} ครั้งล่าสุด จึงขอแจ้งเตือนเพื่อให้รีบติดต่ออาจารย์ผู้สอนหรือปรับปรุงการเข้าเรียนเพื่อรักษาสิทธิ์การสอบครับ`;
    navigator.clipboard.writeText(text);
    setCopiedId(student.student.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Overall Attendance */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              อัตราเข้าเรียนเฉลี่ย
            </span>
            <div className={`p-1.5 rounded-lg ${averageAttendance >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {averageAttendance >= 80 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {averageAttendance}%
            </span>
            <span className="text-xs font-medium text-slate-500">
              (เกณฑ์มาตรฐาน 80%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            คำนวณจาก {trends.length} สัปดาห์ที่ผ่านมา
          </p>
        </div>

        {/* Normal Group */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              กลุ่มปกติ (≥ 80%)
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
              {normalCount}
            </span>
            <span className="text-xs text-slate-500">
              /{studentStats.length} คน ({studentStats.length > 0 ? Math.round((normalCount / studentStats.length) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            เข้าเรียนสม่ำเสมอ มีสิทธิ์สอบแน่นอน
          </p>
        </div>

        {/* Warning & Critical Groups */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
              เฝ้าระวัง & เสี่ยง
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 tracking-tight">
              {warningCount + criticalCount}
            </span>
            <span className="text-xs text-slate-500">
              (เฝ้าระวัง {warningCount} | เสี่ยง {criticalCount})
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            กลุ่มที่ต้องติดตามและพูดคุยเพิ่มเติม
          </p>
        </div>

        {/* Consecutive Absence Alert */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
              ขาด 2+ ครั้งติดกัน
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
              {consecutiveAlerts.length}
            </span>
            <span className="text-xs font-medium text-rose-600">
              คนเร่งด่วน
            </span>
          </div>
          <p className="text-[11px] text-rose-700/80 mt-1">
            เสี่ยงหลุดออกจากระบบการศึกษา
          </p>
        </div>
      </div>

      {/* HIGHLIGHT: Lowest Attendance Week Analysis Card */}
      {lowestWeek && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent rounded-2xl p-5 border border-amber-300/80 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-200">
                <TrendingDown className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    จุดสังเกตสำคัญ
                  </span>
                  <span className="text-xs text-slate-500">
                    สัปดาห์ที่มีการเข้าเรียนต่ำสุดในภาคเรียน
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  สัปดาห์ที่ {lowestWeek.weekNumber} ({lowestWeek.date}): อัตราเข้าเรียนลดเหลือเพียง {lowestWeek.attendanceRate}%
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  หัวข้อ: <span className="font-semibold">{lowestWeek.topic || 'ไม่มีระบุ'}</span> (มา {lowestWeek.present} คน, สาย {lowestWeek.late} คน, ขาด {lowestWeek.absent} คน, ลา {lowestWeek.leave} คน)
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    💡 <strong>คำแนะนำอาจารย์:</strong> สัปดาห์นี้การเข้าเรียนดรอปลงอย่างเห็นได้ชัด อาจตรงกับช่วงกิจกรรมสโมสรหรือเตรียมสอบ แนะนำทบทวนเนื้อหาย้อนหลังสั้นๆ หรืออัปโหลดสไลด์สรุปให้นักศึกษา
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => {
                  const s = sessions.find(item => item.id === lowestWeek.sessionId);
                  if (s) {
                    onSelectSession(s);
                    onNavigateToRollCall();
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
              >
                <span>ดูคาบสัปดาห์ที่ {lowestWeek.weekNumber}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Attendance Line Graph (2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                แนวโน้มการเข้าเรียนรายสัปดาห์ (Weekly Attendance Trend)
              </h2>
              <p className="text-xs text-slate-500">
                แสดงร้อยละการเข้าเรียนสะสมตามคาบเรียน พร้อมเส้นเกณฑ์มาตรฐาน (80%)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-indigo-600"></span>
                <span className="text-slate-600 font-medium">เข้าเรียน (%)</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-rose-500"></span>
                <span className="text-slate-500">เกณฑ์ 80%</span>
              </div>
            </div>
          </div>

          {trends.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              ยังไม่มีข้อมูลการเข้าเรียนในแต่ละสัปดาห์
            </div>
          ) : (
            <div className="relative">
              {/* SVG Line Graph */}
              <div className="h-64 sm:h-72 w-full">
                <svg viewBox="0 0 600 240" className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 80, 100].map((val) => {
                    const y = 200 - (val / 100) * 160;
                    const is80 = val === 80;
                    return (
                      <g key={val}>
                        <line
                          x1="40"
                          y1={y}
                          x2="580"
                          y2={y}
                          stroke={is80 ? '#f43f5e' : '#e2e8f0'}
                          strokeDasharray={is80 ? '4,4' : undefined}
                          strokeWidth={is80 ? '1.5' : '1'}
                        />
                        <text
                          x="32"
                          y={y + 3}
                          fill={is80 ? '#f43f5e' : '#94a3b8'}
                          fontSize="9"
                          textAnchor="end"
                          fontWeight={is80 ? 'bold' : 'normal'}
                        >
                          {val}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Draw the Attendance Trend Line */}
                  {trends.length > 1 && (
                    <path
                      d={trends.reduce((acc, curr, idx) => {
                        const step = (580 - 60) / Math.max(1, trends.length - 1);
                        const x = 60 + idx * step;
                        const y = 200 - (curr.attendanceRate / 100) * 160;
                        return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
                      }, '')}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Draw Points & Tooltips on each week */}
                  {trends.map((t, idx) => {
                    const step = (580 - 60) / Math.max(1, trends.length - 1);
                    const x = trends.length === 1 ? 310 : 60 + idx * step;
                    const y = 200 - (t.attendanceRate / 100) * 160;
                    const isLowest = lowestWeek?.sessionId === t.sessionId;

                    return (
                      <g
                        key={t.sessionId}
                        className="cursor-pointer group"
                        onMouseEnter={() => setActiveTooltipIndex(idx)}
                        onMouseLeave={() => setActiveTooltipIndex(null)}
                      >
                        {/* Outer Glow Circle */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isLowest ? '8' : '6'}
                          fill={isLowest ? '#f59e0b' : '#4f46e5'}
                          opacity={isLowest ? '0.3' : '0.2'}
                        />
                        {/* Inner Circle */}
                        <circle
                          cx={x}
                          cy={y}
                          r={isLowest ? '5' : '4'}
                          fill={isLowest ? '#d97706' : '#4f46e5'}
                          stroke="#ffffff"
                          strokeWidth="2"
                        />

                        {/* Value label above point */}
                        <text
                          x={x}
                          y={y - 10}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="bold"
                          fill={isLowest ? '#b45309' : '#1e293b'}
                        >
                          {t.attendanceRate}%
                        </text>

                        {/* Week Label bottom */}
                        <text
                          x={x}
                          y="225"
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="500"
                          fill="#64748b"
                        >
                          W{t.weekNumber}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Tooltip detail bar */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                {activeTooltipIndex !== null && trends[activeTooltipIndex] ? (
                  <div className="flex items-center gap-3 bg-indigo-50/80 text-indigo-900 px-3 py-1.5 rounded-xl border border-indigo-200">
                    <span className="font-bold">
                      สัปดาห์ที่ {trends[activeTooltipIndex].weekNumber} ({trends[activeTooltipIndex].date}):
                    </span>
                    <span>มา {trends[activeTooltipIndex].present} คน</span>
                    <span>สาย {trends[activeTooltipIndex].late} คน</span>
                    <span>ลา {trends[activeTooltipIndex].leave} คน</span>
                    <span>ขาด {trends[activeTooltipIndex].absent} คน</span>
                    <span className="font-semibold text-indigo-700">
                      คะแนนมีส่วนร่วมเฉลี่ย: {trends[activeTooltipIndex].avgParticipation} / 3
                    </span>
                  </div>
                ) : (
                  <span className="text-slate-400">
                    💡 เลื่อนเมาส์เหนือจุดกราฟเพื่อดูรายละเอียดแต่ละสัปดาห์
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Weekly Participation Score Comparison Bar Chart (1 column) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  การมีส่วนร่วมในชั้นเรียน
                </h2>
                <p className="text-xs text-slate-500">
                  คะแนนเฉลี่ยการตอบคำถาม/กิจกรรม (0-3 คะแนน)
                </p>
              </div>
              <Award className="w-5 h-5 text-indigo-600" />
            </div>

            {/* Bars */}
            <div className="space-y-3 mt-4">
              {trends.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  ยังไม่มีประวัติการมีส่วนร่วม
                </div>
              ) : (
                trends.map((t) => {
                  const percentage = Math.round((t.avgParticipation / 3) * 100);
                  return (
                    <div key={t.sessionId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-700">
                          สัปดาห์ที่ {t.weekNumber}
                        </span>
                        <span className="font-mono font-bold text-indigo-600">
                          {t.avgParticipation} / 3.0 แต้ม
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top Engaged Students highlight */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>ผู้เรียนที่มีส่วนร่วมสูงสุด (Top Active)</span>
            </h4>
            <div className="space-y-1.5">
              {topParticipants.map((tp, idx) => (
                <div key={tp.student.id} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="font-medium text-slate-800 truncate max-w-[140px]">
                      {tp.student.name}
                    </span>
                  </div>
                  <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                    +{tp.totalParticipationScore} แต้ม
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* URGENT ACTION: Consecutive Absence Alert Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                แจ้งเตือนผู้เรียนที่ขาดเรียนเกิน 2 ครั้งติดต่อกัน ({consecutiveAlerts.length} คน)
              </h2>
              <p className="text-xs text-slate-500">
                ระบบตรวจพบผู้เรียนที่ขาดเรียนต่อเนื่องล่าสุด เพื่อให้อาจารย์สามารถส่งข้อความตักเตือนหรือโทรประสานงานได้ทันท่วงที
              </p>
            </div>
          </div>
        </div>

        {consecutiveAlerts.length === 0 ? (
          <div className="p-6 text-center bg-emerald-50/50 rounded-xl border border-emerald-200">
            <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
            <p className="text-sm font-semibold text-emerald-800">
              ยอดเยี่ยม! ไม่มีผู้เรียนที่ขาดเรียนเกิน 2 ครั้งติดต่อกันในวิชานี้
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              ผู้เรียนทุกคนมีการเข้าเรียนหรือส่งใบลาตามระเบียบ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {consecutiveAlerts.map((st) => (
              <div
                key={st.student.id}
                className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          {st.student.studentCode}
                        </span>
                        <span className="text-sm font-semibold text-slate-800">
                          {st.student.name}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {st.student.email || 'ไม่มีอีเมล'} • {st.student.phone || 'ไม่มีเบอร์โทร'}
                      </p>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white">
                      ขาด {st.consecutiveAbsences} ครั้งติด
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 bg-white/80 p-2.5 rounded-lg border border-slate-200/60">
                    <div>
                      เข้าเรียนสะสม: <strong className={st.attendanceRate < 60 ? 'text-rose-600' : 'text-amber-600'}>{st.attendanceRate}%</strong>
                    </div>
                    <div>
                      มา: <strong>{st.presentCount}</strong> | สาย: <strong>{st.lateCount}</strong> | ขาด: <strong className="text-rose-600">{st.absentCount}</strong>
                    </div>
                  </div>
                </div>

                {/* Contact Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-rose-100">
                  {st.student.email && (
                    <a
                      href={`mailto:${st.student.email}?subject=แจ้งเตือนการเข้าเรียนวิชา ${course.code} ${course.name}&body=เรียน คุณ${st.student.name}%0D%0Aอาจารย์ขอแจ้งเตือนเรื่องการขาดเรียนติดต่อกัน ${st.consecutiveAbsences} ครั้งในวิชา ${course.code} กรุณาติดต่ออาจารย์ผู้สอนเพื่อรักษาสิทธิ์การเรียน`}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium transition-colors shadow-xs"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      ส่งอีเมลเตือน
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyNotice(st)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors"
                  >
                    {copiedId === st.student.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-semibold">คัดลอกแล้ว</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        คัดลอกข้อความทัก
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
