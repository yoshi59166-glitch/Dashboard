import React, { useState, useEffect, useCallback } from 'react';
import { 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Download, 
  Sparkles, 
  LogIn, 
  AlertTriangle, 
  BookOpen, 
  Clock, 
  ShieldCheck, 
  Award,
  ChevronRight,
  TrendingDown
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { RollCallView } from './components/RollCallView';
import { DashboardView } from './components/DashboardView';
import { StudentsListView } from './components/StudentsListView';
import { NewCourseModal, NewSessionModal } from './components/CourseModal';
import { ExportModal } from './components/ExportModal';
import { 
  Course, 
  Session, 
  Student, 
  AttendanceRecord, 
  StudentOverallStats, 
  WeeklyTrend 
} from './types';
import { 
  getCoursesByTeacher, 
  createCourse, 
  getStudentsByCourse, 
  addStudent, 
  bulkAddStudents, 
  getSessionsByCourse, 
  createSession, 
  getSessionRecords, 
  saveRecord, 
  bulkUpdateRecords, 
  calculateStudentOverallStats, 
  calculateWeeklyTrends, 
  seedSampleCourse 
} from './services/courseService';

const MainApp: React.FC = () => {
  const { user, loading: authLoading, signInWithGoogle, signInAsDemoTeacher } = useAuth();

  // App State
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [currentSessionRecords, setCurrentSessionRecords] = useState<Record<string, AttendanceRecord>>({});
  const [studentStats, setStudentStats] = useState<StudentOverallStats[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [lowestWeek, setLowestWeek] = useState<WeeklyTrend | null>(null);

  // UI Navigation
  const [activeTab, setActiveTab] = useState<'rollcall' | 'dashboard' | 'students' | 'export'>('rollcall');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Modals
  const [isNewCourseModalOpen, setIsNewCourseModalOpen] = useState(false);
  const [isNewSessionModalOpen, setIsNewSessionModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Load courses when teacher logs in
  const loadTeacherCourses = useCallback(async (teacherId: string) => {
    setIsLoadingData(true);
    try {
      const list = await getCoursesByTeacher(teacherId);
      setCourses(list);
      if (list.length > 0) {
        // Auto-select first course if not already selected
        setSelectedCourse(prev => prev && list.some(c => c.id === prev.id) ? prev : list[0]);
      } else {
        setSelectedCourse(null);
        setSessions([]);
        setSelectedSession(null);
        setStudents([]);
        setCurrentSessionRecords({});
      }
    } catch (err) {
      console.error('Error loading courses:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadTeacherCourses(user.uid);
    } else {
      setCourses([]);
      setSelectedCourse(null);
    }
  }, [user, loadTeacherCourses]);

  // Load Course Content (Students, Sessions)
  const loadCourseData = useCallback(async (course: Course) => {
    setIsLoadingData(true);
    try {
      const [fetchedStudents, fetchedSessions] = await Promise.all([
        getStudentsByCourse(course.id),
        getSessionsByCourse(course.id),
      ]);

      setStudents(fetchedStudents);
      setSessions(fetchedSessions);

      // Pick latest session or first session
      if (fetchedSessions.length > 0) {
        setSelectedSession(prev => {
          if (prev && fetchedSessions.some(s => s.id === prev.id)) {
            return prev;
          }
          return fetchedSessions[fetchedSessions.length - 1]; // latest week
        });
      } else {
        setSelectedSession(null);
      }

      // Compute stats
      const [computedStats, trendData] = await Promise.all([
        calculateStudentOverallStats(course.id, fetchedStudents, fetchedSessions),
        calculateWeeklyTrends(course.id, fetchedSessions, fetchedStudents.length),
      ]);

      setStudentStats(computedStats);
      setWeeklyTrends(trendData.trends);
      setLowestWeek(trendData.lowestWeek);
    } catch (err) {
      console.error('Error loading course data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseData(selectedCourse);
    }
  }, [selectedCourse, loadCourseData]);

  // Load Records for selected session
  const loadSessionRecords = useCallback(async (courseId: string, sessionId: string) => {
    try {
      const recs = await getSessionRecords(courseId, sessionId);
      setCurrentSessionRecords(recs);
    } catch (err) {
      console.error('Error loading session records:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedCourse && selectedSession) {
      loadSessionRecords(selectedCourse.id, selectedSession.id);
    } else {
      setCurrentSessionRecords({});
    }
  }, [selectedCourse, selectedSession, loadSessionRecords]);

  // Record Update handler
  const handleUpdateRecord = async (record: AttendanceRecord) => {
    if (!selectedCourse || !selectedSession) return;
    // Optimistic UI update
    setCurrentSessionRecords(prev => ({
      ...prev,
      [record.studentId]: record,
    }));

    // Save to Firestore
    await saveRecord(selectedCourse.id, selectedSession.id, record);

    // Refresh overall stats in background
    calculateStudentOverallStats(selectedCourse.id, students, sessions).then(stats => {
      setStudentStats(stats);
    });
    calculateWeeklyTrends(selectedCourse.id, sessions, students.length).then(data => {
      setWeeklyTrends(data.trends);
      setLowestWeek(data.lowestWeek);
    });
  };

  // Bulk mark present
  const handleBulkMarkPresent = async () => {
    if (!selectedCourse || !selectedSession || students.length === 0) return;
    const now = new Date().toISOString();
    const updatedRecords: AttendanceRecord[] = students.map(std => {
      const existing = currentSessionRecords[std.id];
      return {
        id: std.id,
        studentId: std.id,
        studentCode: std.studentCode,
        studentName: std.name,
        courseId: selectedCourse.id,
        sessionId: selectedSession.id,
        teacherId: selectedCourse.teacherId,
        status: existing?.status || 'present',
        participationScore: existing?.participationScore ?? 1,
        note: existing?.note || '',
        updatedAt: now,
      };
    });

    const newRecordsMap: Record<string, AttendanceRecord> = {};
    updatedRecords.forEach(r => { newRecordsMap[r.studentId] = r; });
    setCurrentSessionRecords(newRecordsMap);

    await bulkUpdateRecords(selectedCourse.id, selectedSession.id, updatedRecords);

    // Refresh stats
    const [stats, trendData] = await Promise.all([
      calculateStudentOverallStats(selectedCourse.id, students, sessions),
      calculateWeeklyTrends(selectedCourse.id, sessions, students.length),
    ]);
    setStudentStats(stats);
    setWeeklyTrends(trendData.trends);
    setLowestWeek(trendData.lowestWeek);
  };

  // Create new course
  const handleCreateCourse = async (courseData: { code: string; name: string; section: string; term: string; totalPlannedWeeks: number }) => {
    if (!user) return;
    const courseId = `course_${Date.now()}`;
    const newCourse = await createCourse({
      id: courseId,
      code: courseData.code,
      name: courseData.name,
      section: courseData.section,
      term: courseData.term,
      totalPlannedWeeks: courseData.totalPlannedWeeks,
      teacherId: user.uid,
      teacherEmail: user.email || '',
      studentCount: 0,
    });

    // Auto-create Week 1 session for convenience
    const firstSession = await createSession(
      courseId,
      user.uid,
      1,
      new Date().toISOString().split('T')[0],
      'แนะนำรายวิชาและเกณฑ์การวัดผล'
    );

    setCourses(prev => [newCourse, ...prev]);
    setSelectedCourse(newCourse);
    setSessions([firstSession]);
    setSelectedSession(firstSession);
    setStudents([]);
    setCurrentSessionRecords({});
    setStudentStats([]);
    setWeeklyTrends([]);
  };

  // Create new session/week
  const handleCreateSession = async (weekNumber: number, date: string, topic: string) => {
    if (!selectedCourse || !user) return;
    const newSession = await createSession(
      selectedCourse.id,
      user.uid,
      weekNumber,
      date,
      topic
    );

    setSessions(prev => [...prev, newSession].sort((a, b) => a.weekNumber - b.weekNumber));
    setSelectedSession(newSession);
    setActiveTab('rollcall');
  };

  // Add single student
  const handleAddStudent = async (studentData: Omit<Student, 'id' | 'createdAt'>) => {
    if (!selectedCourse) return;
    const newStudent = await addStudent(selectedCourse.id, studentData);
    setStudents(prev => [...prev, newStudent].sort((a, b) => a.studentCode.localeCompare(b.studentCode, undefined, { numeric: true })));
    if (selectedCourse) {
      loadCourseData(selectedCourse);
    }
  };

  // Bulk add students
  const handleBulkAddStudents = async (studentsList: Omit<Student, 'id' | 'createdAt'>[]) => {
    if (!selectedCourse) return;
    await bulkAddStudents(selectedCourse.id, studentsList);
    if (selectedCourse) {
      await loadCourseData(selectedCourse);
    }
  };

  // Helper to fetch all session records for student drilldown
  const fetchAllSessionRecords = async (): Promise<Record<string, Record<string, AttendanceRecord>>> => {
    if (!selectedCourse) return {};
    const results: Record<string, Record<string, AttendanceRecord>> = {};
    for (const s of sessions) {
      const recs = await getSessionRecords(selectedCourse.id, s.id);
      results[s.id] = recs;
    }
    return results;
  };

  // Seed Sample Demo Course
  const handleSeedSampleData = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      const seededCourseId = await seedSampleCourse(user.uid, user.email || 'teacher@university.ac.th');
      await loadTeacherCourses(user.uid);
      const seeded = courses.find(c => c.id === seededCourseId);
      if (seeded) {
        setSelectedCourse(seeded);
      }
    } catch (err) {
      console.error('Error seeding demo course:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  // ----------------------------------------------------
  // GUEST / LOGIN GATE
  // ----------------------------------------------------
  if (!user && !authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between selection:bg-indigo-500">
        <header className="max-w-7xl mx-auto w-full px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight">CheckPoint</span>
              <p className="text-[11px] text-slate-400">Classroom Attendance & Engagement System</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={signInAsDemoTeacher}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              ทดลองใช้งาน (Demo Mode)
            </button>
            <button
              type="button"
              onClick={signInWithGoogle}
              className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>เข้าสู่ระบบด้วย Google</span>
            </button>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>ออกแบบสำหรับอาจารย์ผู้สอน • เช็กชื่อรวดเร็วเสร็จใน 1 นาที</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            รู้ทันทุกการห่างหาย <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              ยกระดับการมีส่วนร่วมในชั้นเรียน
            </span>
          </h1>

          <p className="max-w-2xl mx-auto mt-6 text-sm sm:text-base text-slate-300 leading-relaxed">
            เว็บแอปพลิเคชันเช็กชื่อแบบ Mobile-First บันทึกคะแนนตอบคำถาม 0-3 แต้ม 
            วิเคราะห์แนวโน้มการเข้าเรียนรายสัปดาห์ หาสัปดาห์ที่นักศึกษาหายไปมากที่สุด 
            และแจ้งเตือนผู้เรียนที่ขาดเรียนเกิน 2 ครั้งติดต่อกันแบบเรียลไทม์
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={signInAsDemoTeacher}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>เริ่มทดลองใช้ทันที (เข้าห้องตัวอย่าง)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={signInWithGoogle}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm sm:text-base rounded-2xl border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4 text-indigo-400" />
              <span>ล็อกอินด้วย Google อาจารย์</span>
            </button>
          </div>

          {/* 4 Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 text-left">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">เช็กชื่อเร็วบนมือถือ</h3>
              <p className="text-xs text-slate-400 mt-1">
                ปุ่มสัมผัสขนาดใหญ่ ติ๊ก มา / ขาด / ลา / สาย ได้อย่างคล่องตัว หรือกดเช็ก 'มา' ทั้งห้องในปุ่มเดียว
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">บันทึกการมีส่วนร่วม</h3>
              <p className="text-xs text-slate-400 mt-1">
                ให้คะแนน 0-3 แต้ม สำหรับผู้เรียนที่ตอบคำถาม นำเสนองาน หรือร่วมอภิปรายกลุ่มพร้อมโน้ตพฤติกรรม
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <TrendingDown className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">ตรวจจับสัปดาห์ที่เข้าเรียนต่ำ</h3>
              <p className="text-xs text-slate-400 mt-1">
                กราฟเส้นแสดงแนวโน้มตลอดภาคเรียน พร้อมระบุช่วงสัปดาห์ที่การเข้าเรียนต่ำสุดเพื่อวางแผนทบทวน
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-sm">แจ้งเตือนขาด 2 ครั้งติดกัน</h3>
              <p className="text-xs text-slate-400 mt-1">
                เตือนทันทีเมื่อพบผู้เรียนขาดเรียนติดต่อกันตั้งแต่ 2 ครั้ง พร้อมปุ่มส่งอีเมลหรือคัดลอกข้อความทักตาม
              </p>
            </div>
          </div>
        </main>

        <footer className="max-w-7xl mx-auto w-full px-4 py-6 border-t border-slate-800 text-center text-xs text-slate-500">
          CheckPoint • Classroom Attendance & Engagement System • Powered by Google Cloud Firestore
        </footer>
      </div>
    );
  }

  // ----------------------------------------------------
  // LOGGED-IN TEACHER VIEW
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        courses={courses}
        selectedCourse={selectedCourse}
        onSelectCourse={setSelectedCourse}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'export') {
            setIsExportModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        sessions={sessions}
        selectedSession={selectedSession}
        onSelectSession={setSelectedSession}
        onOpenNewCourseModal={() => setIsNewCourseModalOpen(true)}
        onOpenNewSessionModal={() => setIsNewSessionModalOpen(true)}
        onSeedSampleData={handleSeedSampleData}
        isSeeding={isSeeding}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 flex-1">
        {isLoadingData ? (
          <div className="h-96 flex flex-col items-center justify-center text-slate-400">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs font-medium">กำลังโหลดข้อมูลชั้นเรียนและสถิติ...</p>
          </div>
        ) : !selectedCourse ? (
          /* Empty State: Prompt to create course or seed sample course */
          <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">ยินดีต้อนรับสู่อาจารย์ผู้สอน</h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
              ยังไม่มีรายวิชาในระบบของท่าน ท่านสามารถสร้างรายวิชาใหม่ หรือคลิกปุ่มเพื่อโหลดวิชาตัวอย่าง (พร้อม 20 นักศึกษา และประวัติ 6 สัปดาห์) เพื่อทดสอบฟีเจอร์ทั้งหมดได้ทันที
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                disabled={isSeeding}
                onClick={handleSeedSampleData}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>{isSeeding ? 'กำลังสร้างข้อมูล...' : 'โหลดวิชาตัวอย่าง (Demo Course)'}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsNewCourseModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold"
              >
                สร้างรายวิชาใหม่
              </button>
            </div>
          </div>
        ) : (
          /* Active Tabs */
          <>
            {activeTab === 'rollcall' && (
              selectedSession ? (
                <RollCallView
                  course={selectedCourse}
                  session={selectedSession}
                  students={students}
                  records={currentSessionRecords}
                  studentOverallStats={studentStats}
                  onUpdateRecord={handleUpdateRecord}
                  onBulkMarkPresent={handleBulkMarkPresent}
                  onOpenNewSessionModal={() => setIsNewSessionModalOpen(true)}
                />
              ) : (
                <div className="bg-white rounded-3xl p-8 text-center border border-slate-200">
                  <p className="text-sm font-medium text-slate-700">วิชานี้ยังไม่มีคาบเรียนหรือสัปดาห์ที่บันทึก</p>
                  <button
                    type="button"
                    onClick={() => setIsNewSessionModalOpen(true)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
                  >
                    + เพิ่มคาบเรียนสัปดาห์ที่ 1
                  </button>
                </div>
              )
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                course={selectedCourse}
                sessions={sessions}
                trends={weeklyTrends}
                lowestWeek={lowestWeek}
                studentStats={studentStats}
                onSelectSession={setSelectedSession}
                onNavigateToRollCall={() => setActiveTab('rollcall')}
              />
            )}

            {activeTab === 'students' && (
              <StudentsListView
                course={selectedCourse}
                students={students}
                sessions={sessions}
                studentStats={studentStats}
                onAddStudent={handleAddStudent}
                onBulkAddStudents={handleBulkAddStudents}
                fetchAllSessionRecords={fetchAllSessionRecords}
              />
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <NewCourseModal
        isOpen={isNewCourseModalOpen}
        onClose={() => setIsNewCourseModalOpen(false)}
        onCreateCourse={handleCreateCourse}
      />

      <NewSessionModal
        isOpen={isNewSessionModalOpen}
        onClose={() => setIsNewSessionModalOpen(false)}
        nextWeekNumber={sessions.length + 1}
        onCreateSession={handleCreateSession}
      />

      {selectedCourse && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          course={selectedCourse}
          sessions={sessions}
          studentStats={studentStats}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
