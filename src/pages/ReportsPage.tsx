import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import ReportsCategoryPage from "./ReportsCategoryPage";

// `key` makes React start each category with fresh filters and a fresh selected report.

export function AttendanceReportsPage() {
    return <ReportsCategoryPage key="Attendance" group="Attendance" />;
}

export function ComplianceReportsPage() {
    return <ReportsCategoryPage key="Compliance" group="Compliance" />;
}

export function EvaluationReportsPage() {
    return <ReportsCategoryPage key="Evaluations" group="Evaluations" />;
}

export function CompletionReportsPage() {
    return <ReportsCategoryPage key="Completion" group="Completion" />;
}

export function PlacementReportsPage() {
    return <ReportsCategoryPage key="Placements" group="Placements" />;
}

export function AuditReportsPage() {
    return <ReportsCategoryPage key="Audit" group="Audit" />;
}

/** Super admin only: everyone else is sent back to the first report page. */
export function SummaryReportsPage() {
    const { user } = useAuth();

    if (user?.role?.name !== "super_admin") {
        return <Navigate to="/reports/attendance" replace />;
    }

    return <ReportsCategoryPage key="Summary" group="Summary" />;
}