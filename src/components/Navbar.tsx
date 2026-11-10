import React, { useState } from 'react';
import { 
  CheckCircle2, 
  BarChart3, 
  Users, 
  Download, 
  PlusCircle, 
  LogOut, 
  LogIn, 
  BookOpen, 
  ChevronDown,
  Sparkles,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Course, Session } from '../types';

interface NavbarProps {
  courses: Course[];
  selectedCourse: Course | null;
  onSelectCourse: (course: Course) => void;
  activeTab: 'rollcall' | 'dashboard' | 'students' | 'export';
  setActiveTab: (tab: 'rollcall' | 'dashboard' | 'students' | 'export') => void;
  sessions: Session[];
  selectedSession: Session | null;
  onSelectSession: (session: Session) => void;
  onOpenNewCourseModal: () => void;
  onOpenNewSessionModal: () => void;
  onSeedSampleData: () => void;
  isSeeding: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  courses,
  selectedCourse,
  onSelectCourse,
  activeTab,
  setActiveTab,
  sessions,
  selectedSession,
  onSelectSession,
  onOpenNewCourseModal,
  onOpenNewSessionModal,
  onSeedSampleData,
  isSeeding,
}) => {
  const { user, isDemoUser, signInWithGoogle, signInAsDemoTeacher, logout } = useAuth();
  const [courseDropdownOpen, setCourseDropdownOpen] = useState(false);
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900">CheckPoint</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 hidden sm:inline-block">
                  Classroom Roll Call
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                ระบบเช็กชื่อ & ติดตามการมีส่วนร่วมในชั้นเรียน
              </p>
            </div>
          </div>

          {/* Course & Session Selector (Centered on Desktop) */}
          {user && (
            <div className="flex items-center gap-2">
              {/* Course Selector Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setCourseDropdownOpen(!courseDropdownOpen);
                    setSessionDropdownOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-800 border border-slate-200 transition-colors"
                >
                  <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="max-w-[110px] sm:max-w-[160px] truncate">
                    {selectedCourse ? `${selectedCourse.code} (${selectedCourse.name})` : 'เลือกรายวิชา'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {courseDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      รายวิชาทั้งหมด ({courses.length})
                    </div>
                    <div className="max-h-60 overflow-y-auto py-1">
                      {courses.length === 0 ? (
                        <div className="px-4 py-4 text-center text-xs text-slate-500">
                          ยังไม่มีรายวิชาในระบบ
                        </div>
                      ) : (
                        courses.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              onSelectCourse(c);
                              setCourseDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex flex-col transition-colors ${
                              selectedCourse?.id === c.id
                                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span className="font-medium text-slate-900">{c.code} - {c.name}</span>
                            <span className="text-[11px] text-slate-500">{c.section} • ภาคเรียน {c.term}</span>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="p-2 border-t border-slate-100 flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCourseDropdownOpen(false);
                          onOpenNewCourseModal();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200 transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        เพิ่มรายวิชาใหม่
                      </button>

                      <button
                        type="button"
                        disabled={isSeeding}
                        onClick={() => {
                          setCourseDropdownOpen(false);
                          onSeedSampleData();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-50 border border-amber-200 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        {isSeeding ? 'กำลังสร้างข้อมูลจำลอง...' : 'โหลดวิชาตัวอย่าง (Demo พร้อม 6 สัปดาห์)'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Session Selector (Only if a course is chosen) */}
              {selectedCourse && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setSessionDropdownOpen(!sessionDropdownOpen);
                      setCourseDropdownOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-indigo-50 text-indigo-900 hover:bg-indigo-100 border border-indigo-200/80 transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="max-w-[100px] sm:max-w-[130px] truncate">
                      {selectedSession ? `สัปดาห์ ${selectedSession.weekNumber}` : 'เลือกคาบเรียน'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
                  </button>

                  {sessionDropdownOpen && (
                    <div className="absolute right-0 sm:left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        คาบเรียน / สัปดาห์ ({sessions.length})
                      </div>
                      <div className="max-h-56 overflow-y-auto py-1">
                        {sessions.length === 0 ? (
                          <div className="px-3 py-3 text-center text-xs text-slate-500">
                            ยังไม่มีคาบเรียน
                          </div>
                        ) : (
                          sessions.map((sess) => (
                            <button
                              key={sess.id}
                              type="button"
                              onClick={() => {
                                onSelectSession(sess);
                                setSessionDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs sm:text-sm flex flex-col transition-colors ${
                                selectedSession?.id === sess.id
                                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="font-medium">สัปดาห์ที่ {sess.weekNumber} ({sess.date})</span>
                              <span className="text-[11px] text-slate-500 truncate">{sess.topic || 'ไม่มีหัวข้อ'}</span>
                            </button>
                          ))
                        )}
                      </div>
                      <div className="p-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setSessionDropdownOpen(false);
                            onOpenNewSessionModal();
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-indigo-200"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          เพิ่มคาบเรียน/สัปดาห์ใหม่
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Profile / Auth Area */}
          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                    {user.displayName || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {isDemoUser ? 'อาจารย์ (Demo)' : 'อาจารย์ผู้สอน'}
                  </span>
                </div>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="avatar"
                    className="w-8 h-8 rounded-full border border-slate-300 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {(user.displayName || user.email || 'T')[0].toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={logout}
                  title="ออกจากระบบ"
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={signInAsDemoTeacher}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  ทดลองใช้ (Demo)
                </button>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  เข้าสู่ระบบ
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs (Mobile & Desktop friendly) */}
        {user && selectedCourse && (
          <nav className="flex items-center space-x-1 sm:space-x-4 border-t border-slate-100 py-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('rollcall')}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'rollcall'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>หน้าเช็กชื่อ (Roll Call)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>แดชบอร์ด & แนวโน้ม</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'students'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>รายชื่อ & ประเมินกลุ่มเสี่ยง</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeTab === 'export'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>ส่งออก / พิมพ์รายงาน</span>
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};
