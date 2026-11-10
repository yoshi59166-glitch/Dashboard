export type AttendanceStatus = 'present' | 'late' | 'leave' | 'absent';

export type StatusGroup = 'normal' | 'warning' | 'critical'; // >=80% = normal, 60-79% = warning, <60% = critical

export interface Course {
  id: string;
  code: string;
  name: string;
  section: string;
  term: string;
  teacherId: string;
  teacherEmail: string;
  totalPlannedWeeks: number;
  studentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  studentCode: string; // รหัสนักศึกษา เช่น 66010045
  name: string;        // ชื่อ-นามสกุล
  nickname?: string;   // ชื่อเล่น
  email?: string;
  phone?: string;
  courseId: string;
  teacherId: string;
  createdAt: string;
}

export interface Session {
  id: string;
  courseId: string;
  teacherId: string;
  weekNumber: number;
  date: string; // YYYY-MM-DD
  topic: string;
  summary?: {
    present: number;
    late: number;
    leave: number;
    absent: number;
    unmarked: number;
    total: number;
    attendanceRate: number;
    avgParticipation: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string; // studentId
  studentId: string;
  studentCode: string;
  studentName: string;
  courseId: string;
  sessionId: string;
  teacherId: string;
  status: AttendanceStatus;
  participationScore: number; // 0, 1, 2, 3
  note?: string;
  updatedAt: string;
}

export interface StudentOverallStats {
  student: Student;
  totalSessionsHeld: number;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
  absentCount: number;
  attendanceRate: number; // 0 - 100%
  statusGroup: StatusGroup;
  consecutiveAbsences: number; // ขาดเรียนติดต่อกันล่าสุด
  hasConsecutiveAbsenceAlert: boolean; // >= 2 ครั้งติดกัน
  totalParticipationScore: number;
  averageParticipationScore: number;
  lastAttendedWeek?: number;
}

export interface WeeklyTrend {
  sessionId: string;
  weekNumber: number;
  date: string;
  topic: string;
  totalStudents: number;
  present: number;
  late: number;
  leave: number;
  absent: number;
  attendanceRate: number; // (present + 0.5 * late) / total * 100
  avgParticipation: number;
}
