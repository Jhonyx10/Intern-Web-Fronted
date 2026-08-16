import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/lib/auth'
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
import SchoolYearSectionPage from './pages/dean/SchoolYearSectionPage'
import SectionDetailsPage from './pages/details/SectionDetails'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="/companies/map" element={<CompaniesMapPage />} />
              <Route path="/companies/map/add" element={<AddCompanyPage />} />
              <Route path="/companies/:id" element={<CompanyDetailsPage />} />
              <Route path="/courses" element={<CoursePage />} />
              <Route path="/courses/add" element={<CourseFormPage />} />
              <Route path="/courses/:id" element={<CourseFormPage />} />
              <Route path="/administrator" element={<AdministratorPage/>} />
              <Route path="/dean/coordinators" element={<CoordinatorsPage/>} />
              <Route path="/dean/students" element={<StudentsPage/>} />
              <Route path="/dean/school-year-section" element={<SchoolYearSectionPage/>} />
              <Route path="/dean/school-year-section/:id" element={<SectionDetailsPage/>} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
