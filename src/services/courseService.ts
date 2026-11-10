import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  writeBatch 
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';
import { 
  Course, 
  Student, 
  Session, 
  AttendanceRecord, 
  AttendanceStatus, 
  StudentOverallStats, 
  WeeklyTrend,
  StatusGroup
} from '../types';

// Helper to determine status group
export function calculateStatusGroup(rate: number): StatusGroup {
  if (rate >= 80) return 'normal';
  if (rate >= 60) return 'warning';
  return 'critical';
}

// ----------------------------------------------------
// COURSES
// ----------------------------------------------------
export async function getCoursesByTeacher(teacherId: string): Promise<Course[]> {
  const path = 'courses';
  try {
    const q = query(collection(db, path), where('teacherId', '==', teacherId));
    const snapshot = await getDocs(q);
    const courses: Course[] = [];
    snapshot.forEach(docSnap => {
      courses.push(docSnap.data() as Course);
    });
    // sort by updatedAt descending
    return courses.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createCourse(courseData: Omit<Course, 'createdAt' | 'updatedAt'>): Promise<Course> {
  const path = `courses/${courseData.id}`;
  const now = new Date().toISOString();
  const course: Course = {
    ...courseData,
    createdAt: now,
    updatedAt: now,
  };
  try {
    await setDoc(doc(db, 'courses', course.id), course);
    return course;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ----------------------------------------------------
// STUDENTS
// ----------------------------------------------------
export async function getStudentsByCourse(courseId: string): Promise<Student[]> {
  const path = `courses/${courseId}/students`;
  try {
    const snapshot = await getDocs(collection(db, 'courses', courseId, 'students'));
    const students: Student[] = [];
    snapshot.forEach(docSnap => {
      students.push(docSnap.data() as Student);
    });
    // sort by studentCode ascending
    return students.sort((a, b) => a.studentCode.localeCompare(b.studentCode, undefined, { numeric: true }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addStudent(courseId: string, studentData: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
  const id = `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `courses/${courseId}/students/${id}`;
  const student: Student = {
    ...studentData,
    id,
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'courses', courseId, 'students', id), student);
    return student;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function bulkAddStudents(courseId: string, studentsList: Omit<Student, 'id' | 'createdAt'>[]): Promise<void> {
  const path = `courses/${courseId}/students`;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    studentsList.forEach((std, idx) => {
      const id = `std_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`;
      const ref = doc(db, 'courses', courseId, 'students', id);
      batch.set(ref, {
        ...std,
        id,
        createdAt: now,
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// SESSIONS
// ----------------------------------------------------
export async function getSessionsByCourse(courseId: string): Promise<Session[]> {
  const path = `courses/${courseId}/sessions`;
  try {
    const snapshot = await getDocs(collection(db, 'courses', courseId, 'sessions'));
    const sessions: Session[] = [];
    snapshot.forEach(docSnap => {
      sessions.push(docSnap.data() as Session);
    });
    return sessions.sort((a, b) => a.weekNumber - b.weekNumber);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createSession(
  courseId: string, 
  teacherId: string, 
  weekNumber: number, 
  date: string, 
  topic: string
): Promise<Session> {
  const id = `sess_w${weekNumber}_${Date.now()}`;
  const path = `courses/${courseId}/sessions/${id}`;
  const now = new Date().toISOString();
  const session: Session = {
    id,
    courseId,
    teacherId,
    weekNumber,
    date,
    topic,
    summary: {
      present: 0,
      late: 0,
      leave: 0,
      absent: 0,
      unmarked: 0,
      total: 0,
      attendanceRate: 0,
      avgParticipation: 0,
    },
    createdAt: now,
    updatedAt: now,
  };

  try {
    await setDoc(doc(db, 'courses', courseId, 'sessions', id), session);
    return session;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// ----------------------------------------------------
// ATTENDANCE & PARTICIPATION RECORDS
// ----------------------------------------------------
export async function getSessionRecords(courseId: string, sessionId: string): Promise<Record<string, AttendanceRecord>> {
  const path = `courses/${courseId}/sessions/${sessionId}/records`;
  try {
    const snapshot = await getDocs(collection(db, 'courses', courseId, 'sessions', sessionId, 'records'));
    const recordsMap: Record<string, AttendanceRecord> = {};
    snapshot.forEach(docSnap => {
      const rec = docSnap.data() as AttendanceRecord;
      recordsMap[rec.studentId] = rec;
    });
    return recordsMap;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveRecord(
  courseId: string,
  sessionId: string,
  record: AttendanceRecord
): Promise<void> {
  const path = `courses/${courseId}/sessions/${sessionId}/records/${record.studentId}`;
  try {
    await setDoc(doc(db, 'courses', courseId, 'sessions', sessionId, 'records', record.studentId), {
      ...record,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fast Bulk Save: Mark all unmarked or all students with a status
export async function bulkUpdateRecords(
  courseId: string,
  sessionId: string,
  records: AttendanceRecord[]
): Promise<void> {
  const path = `courses/${courseId}/sessions/${sessionId}/records`;
  try {
    const batch = writeBatch(db);
    const now = new Date().toISOString();
    records.forEach(rec => {
      const ref = doc(db, 'courses', courseId, 'sessions', sessionId, 'records', rec.studentId);
      batch.set(ref, {
        ...rec,
        updatedAt: now,
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ----------------------------------------------------
// COMPUTED ANALYTICS & STATS
// ----------------------------------------------------
export async function calculateStudentOverallStats(
  courseId: string,
  students: Student[],
  sessions: Session[]
): Promise<StudentOverallStats[]> {
  if (sessions.length === 0 || students.length === 0) {
    return students.map(student => ({
      student,
      totalSessionsHeld: 0,
      presentCount: 0,
      lateCount: 0,
      leaveCount: 0,
      absentCount: 0,
      attendanceRate: 100,
      statusGroup: 'normal',
      consecutiveAbsences: 0,
      hasConsecutiveAbsenceAlert: false,
      totalParticipationScore: 0,
      averageParticipationScore: 0,
    }));
  }

  // Fetch records for all sessions
  const sessionRecordsList: Array<{ session: Session; records: Record<string, AttendanceRecord> }> = [];
  // Sort sessions chronologically by weekNumber
  const sortedSessions = [...sessions].sort((a, b) => a.weekNumber - b.weekNumber);

  for (const session of sortedSessions) {
    const recs = await getSessionRecords(courseId, session.id);
    sessionRecordsList.push({ session, records: recs });
  }

  const results: StudentOverallStats[] = students.map(student => {
    let presentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let absentCount = 0;
    let totalParticipationScore = 0;
    let lastAttendedWeek: number | undefined;

    // To calculate consecutive absences (trailing from latest session backwards)
    let consecutiveAbsences = 0;
    let stillCountingConsecutive = true;

    // Check sessions in reverse chronological order for consecutive absences
    const reverseSessions = [...sessionRecordsList].reverse();
    for (const { session, records } of reverseSessions) {
      const rec = records[student.id];
      const status = rec?.status;
      if (status === 'absent') {
        if (stillCountingConsecutive) {
          consecutiveAbsences += 1;
        }
      } else if (status === 'present' || status === 'late' || status === 'leave') {
        stillCountingConsecutive = false;
      }
    }

    // Now calculate totals
    sessionRecordsList.forEach(({ session, records }) => {
      const rec = records[student.id];
      if (rec) {
        if (rec.status === 'present') {
          presentCount++;
          lastAttendedWeek = session.weekNumber;
        } else if (rec.status === 'late') {
          lateCount++;
          lastAttendedWeek = session.weekNumber;
        } else if (rec.status === 'leave') {
          leaveCount++;
        } else if (rec.status === 'absent') {
          absentCount++;
        }
        totalParticipationScore += rec.participationScore || 0;
      } else {
        // Unmarked defaults to not counted or absent depending on preference, let's count as absent if session is past
        absentCount++;
      }
    });

    const totalSessions = sessionRecordsList.length;
    // Standard attendance formula: (Present + 0.5 * Late) / TotalSessions * 100
    // Note: Approved Leave does not penalize or counts according to standard
    const effectiveAttended = presentCount + (0.5 * lateCount);
    const divisor = Math.max(1, totalSessions - leaveCount);
    const attendanceRate = Math.min(100, Math.round((effectiveAttended / divisor) * 100));

    const statusGroup = calculateStatusGroup(attendanceRate);
    const hasConsecutiveAbsenceAlert = consecutiveAbsences >= 2;
    const averageParticipationScore = totalSessions > 0 
      ? Number((totalParticipationScore / totalSessions).toFixed(1)) 
      : 0;

    return {
      student,
      totalSessionsHeld: totalSessions,
      presentCount,
      lateCount,
      leaveCount,
      absentCount,
      attendanceRate,
      statusGroup,
      consecutiveAbsences,
      hasConsecutiveAbsenceAlert,
      totalParticipationScore,
      averageParticipationScore,
      lastAttendedWeek,
    };
  });

  return results;
}

export async function calculateWeeklyTrends(
  courseId: string,
  sessions: Session[],
  totalStudents: number
): Promise<{ trends: WeeklyTrend[]; lowestWeek: WeeklyTrend | null }> {
  if (sessions.length === 0) return { trends: [], lowestWeek: null };

  const sorted = [...sessions].sort((a, b) => a.weekNumber - b.weekNumber);
  const trends: WeeklyTrend[] = [];

  for (const sess of sorted) {
    const records = await getSessionRecords(courseId, sess.id);
    const recList = Object.values(records);

    let present = 0;
    let late = 0;
    let leave = 0;
    let absent = 0;
    let sumScore = 0;

    recList.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'leave') leave++;
      else if (r.status === 'absent') absent++;
      sumScore += r.participationScore || 0;
    });

    // If total registered students is higher, remainder are unmarked/absent
    const recordedCount = present + late + leave + absent;
    if (totalStudents > recordedCount) {
      absent += (totalStudents - recordedCount);
    }

    const denominator = Math.max(1, (totalStudents || recordedCount) - leave);
    const rate = Math.round(((present + (0.5 * late)) / denominator) * 100);
    const avgScore = recordedCount > 0 ? Number((sumScore / recordedCount).toFixed(1)) : 0;

    trends.push({
      sessionId: sess.id,
      weekNumber: sess.weekNumber,
      date: sess.date,
      topic: sess.topic || `สัปดาห์ที่ ${sess.weekNumber}`,
      totalStudents: totalStudents || recordedCount,
      present,
      late,
      leave,
      absent,
      attendanceRate: rate,
      avgParticipation: avgScore,
    });
  }

  // Find lowest week
  let lowestWeek: WeeklyTrend | null = null;
  if (trends.length > 0) {
    lowestWeek = trends.reduce((min, curr) => (curr.attendanceRate < min.attendanceRate ? curr : min), trends[0]);
  }

  return { trends, lowestWeek };
}

// ----------------------------------------------------
// SEED INITIAL SAMPLE DATA (DEMO COURSE)
// ----------------------------------------------------
export async function seedSampleCourse(teacherId: string, teacherEmail: string): Promise<string> {
  const courseId = `demo_course_${Date.now()}`;
  const course: Course = {
    id: courseId,
    code: 'CS204',
    name: 'การออกแบบขั้นตอนวิธีและการเขียนโปรแกรม (Algorithms & Programming)',
    section: 'Sec 1 (บรรยาย+ปฏิบัติ)',
    term: '1/2569',
    teacherId,
    teacherEmail,
    totalPlannedWeeks: 15,
    studentCount: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, 'courses', courseId), course);

  // 20 Realistic Thai Students
  const sampleStudents = [
    { code: '66010012', name: 'กิตติศักดิ์ วงศ์สุวรรณ', nickname: 'กิต', email: 'kittisak.w@std.ac.th', phone: '081-234-5678' },
    { code: '66010025', name: 'จิราพร รัตนโชติ', nickname: 'แพร', email: 'jiraporn.r@std.ac.th', phone: '082-345-6789' },
    { code: '66010034', name: 'ชานนท์ เมธากุล', nickname: 'นนท์', email: 'chanon.m@std.ac.th', phone: '083-456-7890' },
    { code: '66010048', name: 'ณัฐกานต์ ศรีสวัสดิ์', nickname: 'ณัฐ', email: 'nattakan.s@std.ac.th', phone: '084-567-8901' },
    { code: '66010059', name: 'ดนัย บุญมี', nickname: 'บอส', email: 'danai.b@std.ac.th', phone: '085-678-9012' },
    { code: '66010067', name: 'ทักษอร ประเสริฐวิทย์', nickname: 'ออม', email: 'taksaon.p@std.ac.th', phone: '086-789-0123' },
    { code: '66010078', name: 'ธนวัฒน์ พงษ์ศิริ', nickname: 'ท็อป', email: 'thanawat.p@std.ac.th', phone: '087-890-1234' },
    { code: '66010086', name: 'ธีรเดช บวรวงศ์', nickname: 'เดช', email: 'theeradech.b@std.ac.th', phone: '088-901-2345' },
    { code: '66010099', name: 'นภาพร สถิตกุล', nickname: 'ฟ้า', email: 'naphaporn.s@std.ac.th', phone: '089-012-3456' },
    { code: '66010108', name: 'ปกรณ์เกียรติ วิจิตร', nickname: 'กร', email: 'pakornkiat.v@std.ac.th', phone: '090-123-4567' },
    { code: '66010115', name: 'ปวีณา มณีกุล', nickname: 'วี', email: 'paweena.m@std.ac.th', phone: '091-234-5678' },
    { code: '66010126', name: 'พงศกร สันติสุข', nickname: 'ก้อง', email: 'pongsakorn.s@std.ac.th', phone: '092-345-6789' },
    { code: '66010137', name: 'ภัทรดนัย เตชะวณิช', nickname: 'ภูมิ', email: 'patradanai.t@std.ac.th', phone: '093-456-7890' },
    { code: '66010149', name: 'มณฑิรา วาสนา', nickname: 'มุก', email: 'monthira.v@std.ac.th', phone: '094-567-8901' },
    { code: '66010158', name: 'วรเมธ วิเศษชัย', nickname: 'เมธ', email: 'woramet.v@std.ac.th', phone: '095-678-9012' },
    { code: '66010162', name: 'ศิริรัตน์ กิจเจริญ', nickname: 'เกรซ', email: 'sirirat.k@std.ac.th', phone: '096-789-0123' },
    { code: '66010173', name: 'สมัชชา ทรัพย์สมบูรณ์', nickname: 'บอย', email: 'samatcha.s@std.ac.th', phone: '097-890-1234' },
    { code: '66010185', name: 'สิรินธร รุ่งโรจน์', nickname: 'พลอย', email: 'sirinthorn.r@std.ac.th', phone: '098-901-2345' },
    { code: '66010194', name: 'อดิศร นิติกุล', nickname: 'ตั้ม', email: 'adison.n@std.ac.th', phone: '099-012-3456' },
    { code: '66010203', name: 'อรรถพล โกเมศ', nickname: 'โอ๊ต', email: 'attapol.k@std.ac.th', phone: '081-999-8877' },
  ];

  const studentDocs: Student[] = [];
  for (let i = 0; i < sampleStudents.length; i++) {
    const s = sampleStudents[i];
    const stdId = `std_${courseId}_${i + 1}`;
    const student: Student = {
      id: stdId,
      studentCode: s.code,
      name: s.name,
      nickname: s.nickname,
      email: s.email,
      phone: s.phone,
      courseId,
      teacherId,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'courses', courseId, 'students', stdId), student);
    studentDocs.push(student);
  }

  // 6 Teaching Sessions (Weeks 1 to 6)
  // Let's create realistic trends:
  // Week 1: High attendance (Intro)
  // Week 2-4: Good attendance
  // Week 5: Lowest attendance (Exam prep or campus festival week)
  // Week 6: Current active week
  const sessionConfigs = [
    { week: 1, date: '2026-08-11', topic: 'แนะนำรายวิชาและพื้นฐาน Big-O Notation' },
    { week: 2, date: '2026-08-18', topic: 'Array, Linked List และการวิเคราะห์ Time Complexity' },
    { week: 3, date: '2026-08-25', topic: 'Stack และ Queue พร้อมโจทย์ปฏิบัติการ' },
    { week: 4, date: '2026-09-01', topic: 'Recursion และ Divide & Conquer' },
    { week: 5, date: '2026-09-08', topic: 'Sorting Algorithms (Quick Sort, Merge Sort) [สัปดาห์กิจกรรมมหาวิทยาลัย]' },
    { week: 6, date: '2026-09-15', topic: 'Tree & Binary Search Tree (BST) [คาบล่าสุด]' },
  ];

  for (const sc of sessionConfigs) {
    const sessId = `sess_${courseId}_w${sc.week}`;
    const session: Session = {
      id: sessId,
      courseId,
      teacherId,
      weekNumber: sc.week,
      date: sc.date,
      topic: sc.topic,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'courses', courseId, 'sessions', sessId), session);

    // Generate records for each student in this session
    // Specifically arrange so:
    // Student 66010059 (ดนัย บุญมี) has absent in week 5 & week 6 -> 2 CONSECUTIVE ABSENCES ALERT!
    // Student 66010194 (อดิศร นิติกุล) has absent in week 4, 5, 6 -> 3 CONSECUTIVE ABSENCES ALERT & CRITICAL GROUP (<60%)!
    // Student 66010078 (ธนวัฒน์ พงษ์ศิริ) is in WARNING group (~70%)
    // Others mostly normal with good engagement
    for (const std of studentDocs) {
      let status: AttendanceStatus = 'present';
      let participationScore = Math.floor(Math.random() * 3) + 1; // 1 to 3
      let note = '';

      if (std.studentCode === '66010194') { // อดิศร (เสี่ยงวิกฤต ขาด 3 ครั้งติด)
        if (sc.week >= 4) {
          status = 'absent';
          participationScore = 0;
          note = 'ไม่พบในห้องเรียน ติดต่อไม่ได้';
        } else {
          status = sc.week === 1 ? 'present' : 'late';
          participationScore = 1;
        }
      } else if (std.studentCode === '66010059') { // ดนัย (ขาด 2 ครั้งติดกันล่าสุด w5, w6)
        if (sc.week >= 5) {
          status = 'absent';
          participationScore = 0;
          note = 'ขาดเรียนติดต่อกัน 2 ครั้ง';
        } else {
          status = 'present';
          participationScore = 2;
        }
      } else if (std.studentCode === '66010078') { // ธนวัฒน์ (กลุ่มเฝ้าระวัง สายบ่อย ขาด w2, w5)
        if (sc.week === 2 || sc.week === 5) {
          status = 'absent';
          participationScore = 0;
        } else if (sc.week === 3 || sc.week === 6) {
          status = 'late';
          participationScore = 1;
          note = 'เข้าสาย 20 นาที';
        } else {
          status = 'present';
          participationScore = 2;
        }
      } else if (std.studentCode === '66010149') { // มณฑิรา (ลาป่วย w5)
        if (sc.week === 5) {
          status = 'leave';
          participationScore = 0;
          note = 'มีใบรับรองแพทย์ส่งผ่านระบบ';
        } else {
          status = 'present';
          participationScore = 3;
          note = 'ตอบคำถามและช่วยอธิบายโค้ดให้เพื่อน';
        }
      } else if (sc.week === 5) {
        // Week 5 dip: 4 students absent, 3 late
        const rand = Math.random();
        if (rand < 0.25) {
          status = 'absent';
          participationScore = 0;
        } else if (rand < 0.45) {
          status = 'late';
          participationScore = 1;
        } else {
          status = 'present';
          participationScore = Math.floor(Math.random() * 3) + 1;
        }
      } else {
        // Normal weeks
        const r = Math.random();
        if (r < 0.88) {
          status = 'present';
          participationScore = Math.floor(Math.random() * 3) + 1;
        } else if (r < 0.95) {
          status = 'late';
          participationScore = 1;
        } else {
          status = 'absent';
          participationScore = 0;
        }
      }

      const record: AttendanceRecord = {
        id: std.id,
        studentId: std.id,
        studentCode: std.studentCode,
        studentName: std.name,
        courseId,
        sessionId: sessId,
        teacherId,
        status,
        participationScore,
        note,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'courses', courseId, 'sessions', sessId, 'records', std.id), record);
    }
  }

  return courseId;
}
