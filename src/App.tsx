import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/lib/auth'
import { ThemeProvider } from '@/context/ThemeContext'
import { CompaniesMapPage } from '@/pages/coordinator/CompaniesMapPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { AddCompanyPage } from '@/pages/forms/AddCompanyPage'
import CoursePage from '@/pages/CoursePage'
import { CourseFormPage } from '@/pages/forms/CourseFormPage'
import { CompanyDetailsPage } from '@/pages/details/CompanyDetailsPage'
import AdministratorPage from './pages/AdministratorPage'
import CoordinatorsPage from './pages/dean/Coordinators'
import StudentsPage from './pages/dean/Students'
import { StudentDetailsPage } from './pages/details/StudentDetailsPage'
import SchoolYearSectionPage from './pages/dean/SchoolYearSectionPage'
import SectionDetailsPage from './pages/details/SectionDetails'
import Companies from './pages/Companies'
import { CoordinatorSectionPage } from './pages/coordinator/CoordinatorSectionPage'
import { SupervisorInternsPage } from './pages/supervisor/SupervisorInternsPage'
import { SupervisorAttendancePage } from './pages/supervisor/SupervisorAttendancePage'
import { SettingsPage } from './pages/SettingsPage'

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="/companies/map" element={<CompaniesMapPage />} />
                <Route path="/companies/map/add" element={<AddCompanyPage />} />
                <Route path="/companies/:id" element={<CompanyDetailsPage />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/courses" element={<CoursePage />} />
                <Route path="/courses/add" element={<CourseFormPage />} />
                <Route path="/courses/:id" element={<CourseFormPage />} />
                <Route path="/administrator" element={<AdministratorPage />} />
                <Route path="/coordinators" element={<CoordinatorsPage />} />
                <Route path="/students" element={<StudentsPage />} />
                <Route path="/students/:id" element={<StudentDetailsPage />} />
                <Route path="/school-year-section" element={<SchoolYearSectionPage />} />
                <Route path="/school-year-section/:id" element={<SectionDetailsPage />} />
                {/* Legacy /dean route fallbacks */}
                <Route path="/dean/coordinators" element={<CoordinatorsPage />} />
                <Route path="/dean/students" element={<StudentsPage />} />
                <Route path="/dean/students/:id" element={<StudentDetailsPage />} />
                <Route path="/dean/school-year-section" element={<SchoolYearSectionPage />} />
                <Route path="/dean/school-year-section/:id" element={<SectionDetailsPage />} />
                <Route path="/coordinator/my-section" element={<CoordinatorSectionPage />} />
                <Route path="/supervisor/interns" element={<SupervisorInternsPage />} />
                <Route path="/supervisor/attendance" element={<SupervisorAttendancePage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
