import React, { useState, useMemo } from 'react';
import { 
  Check, 
  Clock, 
  FileText, 
  X, 
  Search, 
  AlertTriangle, 
  Sparkles, 
  CheckCheck, 
  Award, 
  MessageSquare, 
  Calendar,
  Filter,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  Course, 
  Session, 
  Student, 
  AttendanceRecord, 
  AttendanceStatus,
  StudentOverallStats
} from '../types';

interface RollCallViewProps {
  course: Course;
  session: Session;
  students: Student[];
  records: Record<string, AttendanceRecord>;
  studentOverallStats: StudentOverallStats[];
  onUpdateRecord: (record: AttendanceRecord) => Promise<void>;
  onBulkMarkPresent: () => Promise<void>;
  onOpenNewSessionModal: () => void;
}

const QUICK_NOTES = ['ตอบคำถามถูก', 'ช่วยงานกลุ่ม', 'นำเสนองาน', 'ส่งงานตรงเวลา', 'ไม่พร้อม/ลืมชีต'];

export const RollCallView: React.FC<RollCallViewProps> = ({
  course,
  session,
  students,
  records,
  studentOverallStats,
  onUpdateRecord,
  onBulkMarkPresent,
  onOpenNewSessionModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeNoteStudentId, setActiveNoteStudentId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Stats mapping for quick lookup
  const statsMap = useMemo(() => {
    const map = new Map<string, StudentOverallStats>();
    studentOverallStats.forEach(st => map.set(st.student.id, st));
    return map;
  }, [studentOverallStats]);

  // Count current session summary
  const summary = useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let absent = 0;
    let unmarked = 0;

    students.forEach(std => {
      const rec = records[std.id];
      if (!rec || !rec.status) {
        unmarked++;
      } else if (rec.status === 'present') {
        present++;
      } else if (rec.status === 'late') {
        late++;
      } else if (rec.status === 'leave') {
        leave++;
      } else if (rec.status === 'absent') {
        absent++;
      }
    });

    const total = students.length;
    const marked = total - unmarked;
    const percentage = total > 0 ? Math.round((marked / total) * 100) : 0;

    return { total, marked, unmarked, percentage, present, late, leave, absent };
  }, [students, records]);

  // Filter students based on search and status
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      // Search filter
      const matchesSearch = 
        student.studentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.nickname && student.nickname.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Status filter
      const rec = records[student.id];
      const status = rec?.status;
      const stats = statsMap.get(student.id);

      if (filterStatus === 'all') return true;
      if (filterStatus === 'unmarked') return !status;
      if (filterStatus === 'present') return status === 'present';
      if (filterStatus === 'late') return status === 'late';
      if (filterStatus === 'leave') return status === 'leave';
      if (filterStatus === 'absent') return status === 'absent';
      if (filterStatus === 'warning') return stats?.hasConsecutiveAbsenceAlert || stats?.statusGroup === 'critical' || stats?.statusGroup === 'warning';
      return true;
    });
  }, [students, records, statsMap, searchQuery, filterStatus]);

  // Handle fast status change
  const handleStatusChange = async (student: Student, newStatus: AttendanceStatus) => {
    const existing = records[student.id];
    const updated: AttendanceRecord = {
      id: student.id,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.name,
      courseId: course.id,
      sessionId: session.id,
      teacherId: course.teacherId,
      status: newStatus,
      participationScore: existing?.participationScore ?? (newStatus === 'present' ? 1 : 0),
      note: existing?.note || '',
      updatedAt: new Date().toISOString(),
    };

    await onUpdateRecord(updated);

    // If this completed the last unmarked student, trigger confetti
    if (summary.unmarked === 1 && !existing?.status) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  // Handle participation score change (0, 1, 2, 3)
  const handleScoreChange = async (student: Student, score: number) => {
    const existing = records[student.id];
    const updated: AttendanceRecord = {
      id: student.id,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.name,
      courseId: course.id,
      sessionId: session.id,
      teacherId: course.teacherId,
      status: existing?.status || 'present',
      participationScore: score,
      note: existing?.note || '',
      updatedAt: new Date().toISOString(),
    };

    await onUpdateRecord(updated);
  };

  // Bulk mark present for speed
  const handleFastBulkPresent = async () => {
    if (window.confirm('ต้องการทำเครื่องหมาย "มา" ให้ผู้เรียนที่ยังไม่เช็กทั้งหมดหรือไม่?')) {
      setIsBulkLoading(true);
      try {
        await onBulkMarkPresent();
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } finally {
        setIsBulkLoading(false);
      }
    }
  };

  const handleSaveNote = async (student: Student) => {
    const existing = records[student.id];
    const updated: AttendanceRecord = {
      id: student.id,
      studentId: student.id,
      studentCode: student.studentCode,
      studentName: student.name,
      courseId: course.id,
      sessionId: session.id,
      teacherId: course.teacherId,
      status: existing?.status || 'present',
      participationScore: existing?.participationScore || 0,
      note: noteDraft,
      updatedAt: new Date().toISOString(),
    };

    await onUpdateRecord(updated);
    setActiveNoteStudentId(null);
    setNoteDraft('');
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Session Title & Date Banner */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200/70 flex flex-col items-center justify-center text-indigo-700 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider">Week</span>
            <span className="text-xl font-bold leading-none">{session.weekNumber}</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                สัปดาห์ที่ {session.weekNumber}: {session.topic || 'การเช็กชื่อประจำสัปดาห์'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                <Calendar className="w-3 h-3 text-slate-500" />
                {session.date}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {course.code} {course.name} ({course.section})
            </p>
          </div>
        </div>

        {/* Quick Bulk Action Button */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            disabled={isBulkLoading || summary.unmarked === 0}
            onClick={handleFastBulkPresent}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-semibold shadow-xs disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <CheckCheck className="w-4 h-4" />
            <span>เช็ก "มา" ทั้งห้องที่เหลือ ({summary.unmarked} คน)</span>
          </button>
        </div>
      </div>

      {/* Sticky Progress & Status Summary Bar */}
      <div className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl p-3 sm:p-4 shadow-lg border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Progress gauge */}
          <div className="flex items-center gap-3">
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-300 font-medium">ความคืบหน้าการเช็ก</span>
                <span className="text-xs font-bold text-indigo-400">
                  {summary.marked}/{summary.total} ({summary.percentage}%)
                </span>
              </div>
              <div className="w-36 sm:w-48 bg-slate-800 h-2 rounded-full overflow-hidden mt-1 border border-slate-700">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
                  style={{ width: `${summary.percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Quick Counter Pills */}
          <div className="grid grid-cols-4 sm:flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>มา {summary.present}</span>
            </div>
            <div className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-950/80 border border-amber-500/30 text-amber-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>สาย {summary.late}</span>
            </div>
            <div className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-950/80 border border-sky-500/30 text-sky-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-sky-400"></span>
              <span>ลา {summary.leave}</span>
            </div>
            <div className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500/30 text-rose-300 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>ขาด {summary.absent}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารหัสนักศึกษา หรือ ชื่อ-นามสกุล..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', label: `ทั้งหมด (${students.length})` },
            { id: 'unmarked', label: `ยังไม่เช็ก (${summary.unmarked})` },
            { id: 'present', label: `มา (${summary.present})` },
            { id: 'late', label: `สาย (${summary.late})` },
            { id: 'absent', label: `ขาด (${summary.absent})` },
            { id: 'warning', label: '⚠️ กลุ่มเตือน' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === f.id
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Student List Cards (Mobile-first, huge touch targets) */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">ไม่พบรายชื่อนักศึกษาที่ค้นหา</p>
            <p className="text-xs text-slate-400 mt-1">ลองล้างตัวกรองหรือเปลี่ยนคำค้นหา</p>
          </div>
        ) : (
          filteredStudents.map((student, index) => {
            const rec = records[student.id];
            const currentStatus = rec?.status;
            const currentScore = rec?.participationScore ?? 0;
            const stats = statsMap.get(student.id);
            const isConsecutiveAlert = stats?.hasConsecutiveAbsenceAlert;

            return (
              <div
                key={student.id}
                className={`bg-white rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 ${
                  currentStatus === 'present'
                    ? 'border-emerald-200/80 bg-emerald-50/20 shadow-xs'
                    : currentStatus === 'absent'
                    ? 'border-rose-300 bg-rose-50/30 shadow-xs'
                    : currentStatus === 'late'
                    ? 'border-amber-200 bg-amber-50/20'
                    : currentStatus === 'leave'
                    ? 'border-sky-200 bg-sky-50/20'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Student Info & Alert Badge */}
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                          {student.studentCode}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-800">
                          {student.name}
                        </span>
                        {student.nickname && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            ({student.nickname})
                          </span>
                        )}
                      </div>

                      {/* Cumulative Stats and Warning Indicators */}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {/* Attendance Rate Badge */}
                        {stats && (
                          <span
                            className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                              stats.statusGroup === 'normal'
                                ? 'bg-emerald-100 text-emerald-800'
                                : stats.statusGroup === 'warning'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            สะสม {stats.attendanceRate}% ({stats.statusGroup === 'normal' ? 'ปกติ' : stats.statusGroup === 'warning' ? 'เฝ้าระวัง' : 'เสี่ยง'})
                          </span>
                        )}

                        {/* Consecutive Absences Warning (>= 2 times) */}
                        {isConsecutiveAlert && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            ขาดเรียน {stats?.consecutiveAbsences} ครั้งติดกัน!
                          </span>
                        )}

                        {/* Quick Note preview */}
                        {rec?.note && (
                          <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-slate-400" />
                            {rec.note}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Area: Status Buttons & Participation Score */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {/* Big Touch Buttons for Attendance Status */}
                    <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student, 'present')}
                        className={`h-11 sm:h-10 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1 transition-all active:scale-95 ${
                          currentStatus === 'present'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-600 ring-offset-1'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100/80 border border-emerald-200'
                        }`}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>มา</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(student, 'late')}
                        className={`h-11 sm:h-10 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1 transition-all active:scale-95 ${
                          currentStatus === 'late'
                            ? 'bg-amber-500 text-white shadow-md shadow-amber-200 ring-2 ring-amber-500 ring-offset-1'
                            : 'bg-amber-50 text-amber-800 hover:bg-amber-100/80 border border-amber-200'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>สาย</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(student, 'leave')}
                        className={`h-11 sm:h-10 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1 transition-all active:scale-95 ${
                          currentStatus === 'leave'
                            ? 'bg-sky-600 text-white shadow-md shadow-sky-200 ring-2 ring-sky-600 ring-offset-1'
                            : 'bg-sky-50 text-sky-800 hover:bg-sky-100/80 border border-sky-200'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>ลา</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleStatusChange(student, 'absent')}
                        className={`h-11 sm:h-10 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1 transition-all active:scale-95 ${
                          currentStatus === 'absent'
                            ? 'bg-rose-600 text-white shadow-md shadow-rose-200 ring-2 ring-rose-600 ring-offset-1'
                            : 'bg-rose-50 text-rose-800 hover:bg-rose-100/80 border border-rose-200'
                        }`}
                      >
                        <X className="w-4 h-4 stroke-[3]" />
                        <span>ขาด</span>
                      </button>
                    </div>

                    {/* Participation Score selector (0 - 3) */}
                    <div className="flex items-center justify-between sm:justify-start gap-1 bg-slate-100 p-1 rounded-xl">
                      <span className="text-[11px] font-medium text-slate-500 px-1 hidden sm:inline">
                        มีส่วนร่วม:
                      </span>
                      {[0, 1, 2, 3].map(score => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => handleScoreChange(student, score)}
                          title={`ให้คะแนนมีส่วนร่วม ${score} แต้ม`}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                            currentScore === score
                              ? 'bg-indigo-600 text-white shadow-xs scale-105'
                              : 'text-slate-600 hover:bg-white/80'
                          }`}
                        >
                          {score === 0 ? '0' : `+${score}`}
                        </button>
                      ))}

                      {/* Note button */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveNoteStudentId(activeNoteStudentId === student.id ? null : student.id);
                          setNoteDraft(rec?.note || '');
                        }}
                        title="เพิ่มโน้ตพฤติกรรม"
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          rec?.note ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-slate-700'
                        }`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Inline Note Drawer if active */}
                {activeNoteStudentId === student.id && (
                  <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in duration-150">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">
                          บันทึกโน้ต/พฤติกรรมสำหรับ {student.name}:
                        </span>
                        <div className="flex items-center gap-1">
                          {QUICK_NOTES.map(qn => (
                            <button
                              key={qn}
                              type="button"
                              onClick={() => setNoteDraft(prev => (prev ? `${prev}, ${qn}` : qn))}
                              className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 px-2 py-0.5 rounded-full transition-colors"
                            >
                              +{qn}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          placeholder="พิมพ์ข้อความ เช่น ตอบคำถามได้ดีเยี่ยม, ส่งงานหน้าห้อง..."
                          className="flex-1 text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveNote(student)}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveNoteStudentId(null)}
                          className="px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
