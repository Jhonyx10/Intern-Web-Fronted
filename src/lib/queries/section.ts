import { apiRequest } from "../api";
import { queryKeys } from "../query-keys";
import type { Section } from "@/types";

export const sectionQueries = {
    bySchoolYear: (schoolYearId: string, token: string) => ({
        queryKey: queryKeys.sections.bySchoolYear(schoolYearId),
        queryFn: () => apiRequest<Section[]>(`/sections?school_year_id=${schoolYearId}`, { token }),
    }),
    details: (id: number, token: string) => ({
        queryKey: queryKeys.sections.detail(id),
        queryFn: () => apiRequest<Section>(`/sections/${id}`, { token }),
    }),
}