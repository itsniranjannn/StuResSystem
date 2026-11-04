import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth, homeFor } from './lib/auth.jsx';
import Shell from './components/Shell.jsx';
import { Spinner } from './components/ui.jsx';

const L = (f) => lazy(f);
const Landing = L(() => import('./pages/Landing.jsx'));
const Login = L(() => import('./pages/Login.jsx'));
const Register = L(() => import('./pages/Register.jsx'));
const Forgot = L(() => import('./pages/Forgot.jsx'));
const Reset = L(() => import('./pages/Reset.jsx'));
const PublicResult = L(() => import('./pages/PublicResult.jsx'));
const Verify = L(() => import('./pages/Verify.jsx'));
const Algorithms = L(() => import('./pages/Algorithms.jsx'));
const GpaChecker = L(() => import('./pages/GpaChecker.jsx'));
const Account = L(() => import('./pages/Account.jsx'));
const Ranking = L(() => import('./pages/Ranking.jsx'));
const NotFound = L(() => import('./pages/NotFound.jsx'));
const AdminDashboard = L(() => import('./pages/admin/Dashboard.jsx'));
const AdminInsights = L(() => import('./pages/admin/Insights.jsx'));
const AdminPrograms = L(() => import('./pages/admin/Programs.jsx'));
const AdminStudents = L(() => import('./pages/admin/Students.jsx'));
const AdminTeachers = L(() => import('./pages/admin/Teachers.jsx'));
const AdminSubjects = L(() => import('./pages/admin/Subjects.jsx'));
const AdminResults = L(() => import('./pages/admin/Results.jsx'));
const AdminMail = L(() => import('./pages/admin/Mail.jsx'));
const AdminNotices = L(() => import('./pages/admin/Notices.jsx'));
const AdminSettings = L(() => import('./pages/admin/Settings.jsx'));
const AdminAudit = L(() => import('./pages/admin/Audit.jsx'));
const Classes = L(() => import('./pages/Classes.jsx'));
const TeacherHome = L(() => import('./pages/teacher/Home.jsx'));
const TeacherMarks = L(() => import('./pages/teacher/Marks.jsx'));
const TeacherAttendance = L(() => import('./pages/teacher/Attendance.jsx'));
const TeacherAnalytics = L(() => import('./pages/teacher/Analytics.jsx'));
const StudentHome = L(() => import('./pages/student/Home.jsx'));
const StudentResults = L(() => import('./pages/student/Results.jsx'));
const StudentAttendance = L(() => import('./pages/student/Attendance.jsx'));
const StudentInsights = L(() => import('./pages/student/Insights.jsx'));

function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return children;
}
const GuestOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Navigate to={homeFor(user.role)} replace /> : children;
};
const R = (roles, el) => <Guard roles={roles}>{el}</Guard>;

// The algorithms explorer is public: visitors get a standalone page, signed-in users get it inside their portal.
function GpaRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Shell><GpaChecker /></Shell> : <GpaChecker />;
}
function AlgorithmsRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Shell><Algorithms /></Shell> : <Algorithms />;
}

export default function App() {
  return (
    <Suspense fallback={<div style={{ padding: 30 }}><Spinner /></div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/result" element={<PublicResult />} />
        <Route path="/algorithms" element={<AlgorithmsRoute />} />
        <Route path="/gpa" element={<GpaRoute />} />
        <Route path="/verify" element={<Verify />} />
        <Route path="/verify/:code" element={<Verify />} />
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route path="/forgot" element={<GuestOnly><Forgot /></GuestOnly>} />
        <Route path="/reset-password/:token" element={<GuestOnly><Reset /></GuestOnly>} />
        <Route element={<Guard><Shell /></Guard>}>
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin" element={R(['admin'], <AdminDashboard />)} />
          <Route path="/admin/insights" element={R(['admin'], <AdminInsights />)} />
          <Route path="/admin/programs" element={R(['admin'], <AdminPrograms />)} />
          <Route path="/admin/students" element={R(['admin'], <AdminStudents />)} />
          <Route path="/admin/teachers" element={R(['admin'], <AdminTeachers />)} />
          <Route path="/admin/subjects" element={R(['admin'], <AdminSubjects />)} />
          <Route path="/admin/results" element={R(['admin'], <AdminResults />)} />
          <Route path="/admin/mail" element={R(['admin'], <AdminMail />)} />
          <Route path="/admin/notices" element={R(['admin'], <AdminNotices />)} />
          <Route path="/admin/settings" element={R(['admin'], <AdminSettings />)} />
          <Route path="/admin/audit" element={R(['admin'], <AdminAudit />)} />
          <Route path="/teacher" element={R(['teacher'], <TeacherHome />)} />
          <Route path="/teacher/marks" element={R(['teacher'], <TeacherMarks />)} />
          <Route path="/teacher/attendance" element={R(['teacher'], <TeacherAttendance />)} />
          <Route path="/teacher/analytics" element={R(['teacher'], <TeacherAnalytics />)} />
          <Route path="/student" element={R(['student'], <StudentHome />)} />
          <Route path="/student/results" element={R(['student'], <StudentResults />)} />
          <Route path="/student/attendance" element={R(['student'], <StudentAttendance />)} />
          <Route path="/student/insights" element={R(['student'], <StudentInsights />)} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
