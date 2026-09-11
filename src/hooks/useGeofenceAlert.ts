import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toaster';
import { echo } from '@/lib/echo'; // adjust this import path to wherever this file actually lives

export function useGeofenceAlerts() {
    const { user } = useAuth();
    const { addToast } = useToast();

    const u = user as any;
    const role = u?.role?.name;
    const courseId = u?.dean_portal_course_id ?? u?.coordinator_course_id ?? null;

    useEffect(() => {
        const isSupervisor = role === 'dean' || role === 'coordinator' || role === 'program_head';
        if (!isSupervisor || !courseId) return;

        const channel = echo.private(`course.${courseId}.supervisors`);

        channel.listen('.geofence.transition', (payload: any) => {
            if (payload.event_type === 'exit') {
                addToast('warning', 'Left Premises', payload.message);
            } else if (payload.is_first_arrival) {
                addToast('success', 'Arrived On-Site', payload.message);
            } else {
                addToast('info', 'Returned', payload.message);
            }
        });

        return () => {
            echo.leave(`course.${courseId}.supervisors`);
        };
    }, [role, courseId]);
}