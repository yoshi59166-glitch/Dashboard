import React, { useState } from 'react';
import { Download, Printer, FileSpreadsheet, Check, X, ShieldAlert, Award } from 'lucide-react';
import { Course, Session, StudentOverallStats } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  sessions: Session[];
  studentStats: StudentOverallStats[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  course,
  sessions,
  studentStats,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  // Export CSV with UTF-8 BOM
  const handleExportCSV = () => {
    // UTF-8 BOM: \uFEFF to force Excel to recognize UTF-8 properly in Thai
    const bom = '\uFEFF';
    const headers = [
      'ลำดับ',
      'รหัสนักศึกษา',
      'ชื่อ-นามสกุล',
      'ชื่อเล่น',
      'ร้อยละการเข้าเรียน (%)',
      'สถานะกลุ่ม',
      'มา (ครั้ง)',
      'สาย (ครั้ง)',
      'ลา (ครั้ง)',
      'ขาด (ครั้ง)',
      'ขาดติดต่อกันล่าสุด (ครั้ง)',
      'คะแนนการมีส่วนร่วมรวม',
      'คะแนนการมีส่วนร่วมเฉลี่ย',
      'อีเมล',
      'เบอร์โทรศัพท์'
    ];

    const rows = studentStats.map((st, index) => {
      const groupLabel = st.statusGroup === 'normal' 
        ? 'ปกติ' 
        : st.statusGroup === 'warning' 
        ? 'เฝ้าระวัง' 
        : 'เสี่ยง';

      return [
        index + 1,
        `"${st.student.studentCode}"`,
        `"${st.student.name}"`,
        `"${st.student.nickname || ''}"`,
        st.attendanceRate,
        `"${groupLabel}"`,
        st.presentCount,
        st.lateCount,
        st.leaveCount,
        st.absentCount,
        st.consecutiveAbsences,
        st.totalParticipationScore,
        st.averageParticipationScore,
        `"${st.student.email || ''}"`,
        `"${st.student.phone || ''}"`
      ].join(',');
    });

    const csvContent = bom + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CheckPoint_${course.code}_${course.section}_Attendance_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">ส่งออกข้อมูลและพิมพ์รายงานสรุป</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mt-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
            <strong>วิชา:</strong> {course.code} {course.name} ({course.section}) • ภาคเรียน {course.term}<br />
            <strong>จำนวนผู้เรียน:</strong> {studentStats.length} คน • <strong>สถิติคาบเรียนที่บันทึกแล้ว:</strong> {sessions.length} คาบ
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* CSV Export Button */}
            <div className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">ไฟล์ Excel / CSV</h4>
                <p className="text-xs text-slate-500 mt-1">
                  ดาวน์โหลดตารางสรุปการเข้าเรียน รายชื่อผู้เรียน พร้อมคะแนนมีส่วนร่วม (รองรับภาษาไทย 100%)
                </p>
              </div>

              <button
                type="button"
                onClick={handleExportCSV}
                className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                {downloadSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>ดาวน์โหลดเรียบร้อย!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>ดาวน์โหลด CSV (.csv)</span>
                  </>
                )}
              </button>
            </div>

            {/* Print Report Button */}
            <div className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                  <Printer className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">พิมพ์รายงานสรุป (Print)</h4>
                <p className="text-xs text-slate-500 mt-1">
                  พิมพ์รายงานสรุปผลการเข้าเรียน กลุ่มเฝ้าระวัง และสถิติสำหรับส่งฝ่ายวิชาการคณะ
                </p>
              </div>

              <button
                type="button"
                onClick={handlePrint}
                className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>เปิดหน้าต่างพิมพ์</span>
              </button>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
