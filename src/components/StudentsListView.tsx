import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  AlertTriangle, 
  Award, 
  ChevronRight, 
  X, 
  Calendar, 
  UserPlus, 
  Mail, 
  Phone, 
  CheckCircle2, 
  Clock, 
  FileText,
  ShieldCheck,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';
import { 
  Course, 
  Student, 
  Session, 
  AttendanceRecord, 
  StudentOverallStats, 
  StatusGroup 
} from '../types';

interface StudentsListViewProps {
  course: Course;
  students: Student[];
  sessions: Session[];
  studentStats: StudentOverallStats[];
  onAddStudent: (student: Omit<Student, 'id' | 'createdAt'>) => Promise<void>;
  onBulkAddStudents: (students: Omit<Student, 'id' | 'createdAt'>[]) => Promise<void>;
  fetchAllSessionRecords: () => Promise<Record<string, Record<string, AttendanceRecord>>>;
}

export const StudentsListView: React.FC<StudentsListViewProps> = ({
  course,
  students,
  sessions,
  studentStats,
  onAddStudent,
  onBulkAddStudents,
  fetchAllSessionRecords,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentOverallStats | null>(null);
  const [studentDetailRecords, setStudentDetailRecords] = useState<Record<string, AttendanceRecord> | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // New Student Form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newNickname, setNewNickname] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Bulk import raw text state
  const [importText, setImportText] = useState('');

  // Sort state
  const [sortField, setSortField] = useState<'code' | 'name' | 'attendance' | 'participation'>('code');
  const [sortAsc, setSortAsc] = useState(true);

  // Filtered and sorted stats
  const filteredStats = useMemo(() => {
    return studentStats
      .filter((st) => {
        // Search
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          st.student.studentCode.toLowerCase().includes(query) ||
          st.student.name.toLowerCase().includes(query) ||
          (st.student.nickname && st.student.nickname.toLowerCase().includes(query));

        if (!matchesSearch) return false;

        // Group filter
        if (selectedGroup === 'all') return true;
        if (selectedGroup === 'normal') return st.statusGroup === 'normal';
        if (selectedGroup === 'warning') return st.statusGroup === 'warning';
        if (selectedGroup === 'critical') return st.statusGroup === 'critical';
        if (selectedGroup === 'consecutive') return st.hasConsecutiveAbsenceAlert;

        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'code') {
          cmp = a.student.studentCode.localeCompare(b.student.studentCode, undefined, { numeric: true });
        } else if (sortField === 'name') {
          cmp = a.student.name.localeCompare(b.student.name, 'th');
        } else if (sortField === 'attendance') {
          cmp = a.attendanceRate - b.attendanceRate;
        } else if (sortField === 'participation') {
          cmp = a.totalParticipationScore - b.totalParticipationScore;
        }
        return sortAsc ? cmp : -cmp;
      });
  }, [studentStats, searchQuery, selectedGroup, sortField, sortAsc]);

  const handleOpenStudentDetail = async (st: StudentOverallStats) => {
    setSelectedStudentForModal(st);
    setIsLoadingDetail(true);
    try {
      const allRecords = await fetchAllSessionRecords();
      // Extract records for this student by sessionId
      const recordsMap: Record<string, AttendanceRecord> = {};
      Object.entries(allRecords).forEach(([sessionId, recMap]) => {
        if (recMap[st.student.id]) {
          recordsMap[sessionId] = recMap[st.student.id];
        }
      });
      setStudentDetailRecords(recordsMap);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      alert('กรุณากรอกรหัสนักศึกษาและชื่อ-นามสกุล');
      return;
    }

    await onAddStudent({
      studentCode: newCode.trim(),
      name: newName.trim(),
      nickname: newNickname.trim() || undefined,
      email: newEmail.trim() || undefined,
      phone: newPhone.trim() || undefined,
      courseId: course.id,
      teacherId: course.teacherId,
    });

    setIsAddModalOpen(false);
    setNewCode('');
    setNewName('');
    setNewNickname('');
    setNewEmail('');
    setNewPhone('');
  };

  const handleBulkImport = async () => {
    if (!importText.trim()) return;
    const lines = importText.split('\n').map(l => l.trim()).filter(Boolean);
    const toAdd: Omit<Student, 'id' | 'createdAt'>[] = [];

    lines.forEach(line => {
      // Split by tab or comma
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length >= 2) {
        toAdd.push({
          studentCode: parts[0].trim(),
          name: parts[1].trim(),
          nickname: parts[2]?.trim() || undefined,
          email: parts[3]?.trim() || undefined,
          phone: parts[4]?.trim() || undefined,
          courseId: course.id,
          teacherId: course.teacherId,
        });
      }
    });

    if (toAdd.length === 0) {
      alert('ไม่พบรูปแบบข้อมูลที่ถูกต้อง กรุณาใส่ รหัสนักศึกษา และ ชื่อ-นามสกุล คั่นด้วยเครื่องหมายจุลภาค (,) หรือแท็บ');
      return;
    }

    await onBulkAddStudents(toAdd);
    setIsImportModalOpen(false);
    setImportText('');
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Header and Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>ทะเบียนนักศึกษาและการจัดกลุ่มความเสี่ยง ({students.length} คน)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เกณฑ์ประเมิน: 🟢 ปกติ (≥80%) | 🟡 เฝ้าระวัง (60-79%) | 🔴 เสี่ยงขาดสิทธิ์สอบ (&lt;60%)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            นำเข้ารายชื่อหลายคน
          </button>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            เพิ่มนักศึกษา
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหารหัสนักศึกษา หรือ ชื่อ..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Status Group Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', label: `ทั้งหมด (${studentStats.length})` },
            { id: 'normal', label: `🟢 ปกติ (${studentStats.filter(s => s.statusGroup === 'normal').length})` },
            { id: 'warning', label: `🟡 เฝ้าระวัง (${studentStats.filter(s => s.statusGroup === 'warning').length})` },
            { id: 'critical', label: `🔴 เสี่ยง (${studentStats.filter(s => s.statusGroup === 'critical').length})` },
            { id: 'consecutive', label: `⚠️ ขาด 2+ ติดกัน (${studentStats.filter(s => s.hasConsecutiveAbsenceAlert).length})` },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedGroup(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                selectedGroup === tab.id
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Roster Table on Desktop / Responsive Cards on Mobile */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th 
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortField === 'code') setSortAsc(!sortAsc);
                    else { setSortField('code'); setSortAsc(true); }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>รหัสนักศึกษา</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortField === 'name') setSortAsc(!sortAsc);
                    else { setSortField('name'); setSortAsc(true); }
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>ชื่อ - นามสกุล</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3 px-4 text-center cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortField === 'attendance') setSortAsc(!sortAsc);
                    else { setSortField('attendance'); setSortAsc(false); }
                  }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>การเข้าเรียน</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center hidden sm:table-cell">สถิติ (มา/สาย/ลา/ขาด)</th>
                <th 
                  className="py-3 px-4 text-center cursor-pointer hover:text-slate-900"
                  onClick={() => {
                    if (sortField === 'participation') setSortAsc(!sortAsc);
                    else { setSortField('participation'); setSortAsc(false); }
                  }}
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>คะแนนมีส่วนร่วม</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">สถานะกลุ่ม</th>
                <th className="py-3 px-4 text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
              {filteredStats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    ไม่พบข้อมูลนักศึกษาตามเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredStats.map((st) => {
                  return (
                    <tr
                      key={st.student.id}
                      onClick={() => handleOpenStudentDetail(st)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {st.student.studentCode}
                      </td>

                      {/* Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{st.student.name}</span>
                          {st.student.nickname && (
                            <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
                              {st.student.nickname}
                            </span>
                          )}
                          {st.hasConsecutiveAbsenceAlert && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-600 text-white animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              ขาด 2+ ติด
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Attendance Percentage */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block font-mono font-bold text-sm ${
                          st.statusGroup === 'normal'
                            ? 'text-emerald-700'
                            : st.statusGroup === 'warning'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}>
                          {st.attendanceRate}%
                        </span>
                      </td>

                      {/* Breakdown */}
                      <td className="py-3 px-4 text-center text-xs text-slate-500 hidden sm:table-cell">
                        <span className="text-emerald-600 font-semibold">{st.presentCount}</span> / 
                        <span className="text-amber-600 font-semibold mx-1">{st.lateCount}</span> / 
                        <span className="text-sky-600 font-semibold">{st.leaveCount}</span> / 
                        <span className="text-rose-600 font-semibold ml-1">{st.absentCount}</span>
                      </td>

                      {/* Participation Score */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
                          <Award className="w-3 h-3 text-indigo-500" />
                          +{st.totalParticipationScore}
                        </span>
                      </td>

                      {/* Status Group Badge */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                          st.statusGroup === 'normal'
                            ? 'bg-emerald-100 text-emerald-800'
                            : st.statusGroup === 'warning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {st.statusGroup === 'normal'
                            ? 'ปกติ'
                            : st.statusGroup === 'warning'
                            ? 'เฝ้าระวัง'
                            : 'เสี่ยงตกสิทธิ์'}
                        </span>
                      </td>

                      {/* Action Chevron */}
                      <td className="py-3 px-4 text-right text-slate-400">
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STUDENT DETAIL MODAL (ประวัติรายคน) */}
      {selectedStudentForModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-indigo-700">
                    {selectedStudentForModal.student.studentCode}
                  </span>
                  <span className="text-base font-bold text-slate-900">
                    {selectedStudentForModal.student.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  วิชา {course.code} {course.name} ({course.section})
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForModal(null);
                  setStudentDetailRecords(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Summary Badges */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-slate-100 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">เข้าเรียน</span>
                  <p className="text-lg font-bold text-slate-900">{selectedStudentForModal.attendanceRate}%</p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-50 text-center text-indigo-900">
                  <span className="text-[10px] text-indigo-600 uppercase font-semibold">มีส่วนร่วม</span>
                  <p className="text-lg font-bold text-indigo-700">+{selectedStudentForModal.totalParticipationScore} แต้ม</p>
                </div>
                <div className={`p-3 rounded-xl text-center ${
                  selectedStudentForModal.statusGroup === 'normal'
                    ? 'bg-emerald-50 text-emerald-900'
                    : selectedStudentForModal.statusGroup === 'warning'
                    ? 'bg-amber-50 text-amber-900'
                    : 'bg-rose-50 text-rose-900'
                }`}>
                  <span className="text-[10px] uppercase font-semibold">กลุ่มสถานะ</span>
                  <p className="text-xs font-bold mt-1">
                    {selectedStudentForModal.statusGroup === 'normal' ? 'ปกติ' : selectedStudentForModal.statusGroup === 'warning' ? 'เฝ้าระวัง' : 'เสี่ยง'}
                  </p>
                </div>
              </div>

              {/* Consecutive absence alert */}
              {selectedStudentForModal.hasConsecutiveAbsenceAlert && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <strong>คำเตือน:</strong> ผู้เรียนขาดเรียนติดต่อกัน {selectedStudentForModal.consecutiveAbsences} ครั้งล่าสุด ควรประสานงานด่วน
                  </span>
                </div>
              )}

              {/* Sessions Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  ประวัติการเข้าเรียนรายสัปดาห์
                </h4>
                {isLoadingDetail ? (
                  <div className="py-6 text-center text-xs text-slate-400">กำลังโหลดประวัติ...</div>
                ) : (
                  <div className="space-y-2">
                    {[...sessions]
                      .sort((a, b) => a.weekNumber - b.weekNumber)
                      .map((sess) => {
                        const rec = studentDetailRecords ? studentDetailRecords[sess.id] : null;
                        const status = rec?.status;
                        const score = rec?.participationScore || 0;

                        return (
                          <div
                            key={sess.id}
                            className="p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="font-semibold text-slate-800">
                                สัปดาห์ที่ {sess.weekNumber} ({sess.date})
                              </div>
                              <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                                {sess.topic || 'ไม่มีหัวข้อ'}
                              </div>
                              {rec?.note && (
                                <div className="text-[10px] text-indigo-600 mt-0.5">
                                  โน้ต: {rec.note}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {status === 'present' ? (
                                <span className="px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800">
                                  มา
                                </span>
                              ) : status === 'late' ? (
                                <span className="px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800">
                                  สาย
                                </span>
                              ) : status === 'leave' ? (
                                <span className="px-2 py-0.5 rounded-md font-bold bg-sky-100 text-sky-800">
                                  ลา
                                </span>
                              ) : status === 'absent' ? (
                                <span className="px-2 py-0.5 rounded-md font-bold bg-rose-100 text-rose-800">
                                  ขาด
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md text-slate-400 bg-slate-100">
                                  ยังไม่เช็ก
                                </span>
                              )}

                              <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                +{score} แต้ม
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer with quick contact */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedStudentForModal.student.email && (
                  <a
                    href={`mailto:${selectedStudentForModal.student.email}?subject=ติดตามการเข้าเรียนวิชา ${course.code}&body=เรียน คุณ${selectedStudentForModal.student.name}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    ส่งอีเมล
                  </a>
                )}
                {selectedStudentForModal.student.phone && (
                  <a
                    href={`tel:${selectedStudentForModal.student.phone}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-800 rounded-xl text-xs font-medium hover:bg-slate-300"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    โทร
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForModal(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD SINGLE STUDENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">เพิ่มนักศึกษาใหม่</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateStudent} className="space-y-3 mt-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">รหัสนักศึกษา *</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="เช่น 66010088"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อ - นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="เช่น สมชาย ใจดี"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">ชื่อเล่น (ถ้ามี)</label>
                <input
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  placeholder="เช่น กอล์ฟ"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">อีเมลนักศึกษา (สำหรับแจ้งเตือน)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="student@university.ac.th"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="08X-XXX-XXXX"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
                >
                  บันทึกนักศึกษา
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK IMPORT STUDENTS MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">นำเข้ารายชื่อหลายคน (Bulk Import)</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mt-4">
              <p className="text-xs text-slate-500">
                วางข้อมูลรายชื่อนักศึกษา 1 คนต่อ 1 บรรทัด คั่นด้วยแท็บหรือเครื่องหมายจุลภาค (,) รูปแบบ:<br />
                <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[11px]">รหัสนักศึกษา, ชื่อ-นามสกุล, ชื่อเล่น, อีเมล</code>
              </p>

              <textarea
                rows={7}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`66010001, กรกต จิตมั่น, กต\n66010002, ขวัญฤทัย ใจเย็น, ขวัญ\n66010003, ชินดนัย มีโชค, ชิน`}
                className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleBulkImport}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
                >
                  เริ่มนำเข้า
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
