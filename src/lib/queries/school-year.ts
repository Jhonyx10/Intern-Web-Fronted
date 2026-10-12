import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export type CurrentSchoolYear = {
    id: number;
    name: string;
    semester?: string | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
};

export function useCurrentSchoolYear() {
    const { token } = useAuth();

    return useQuery<CurrentSchoolYear>({
        queryKey: ["school-years", "current"],
        queryFn: () =>
            apiRequest<CurrentSchoolYear>("/school-years/current", { token }),
        enabled: Boolean(token),
        staleTime: 5 * 60 * 1000,
    });
}

export function useSchoolYears() {
    const { token } = useAuth();

    return useQuery<CurrentSchoolYear[]>({
        queryKey: ["school-years"],
        queryFn: () => apiRequest<CurrentSchoolYear[]>("/school-years", { token }),
        enabled: Boolean(token),
    });
}

