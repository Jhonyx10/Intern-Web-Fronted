export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: (token: string | null) => ['auth', 'me', token] as const,
  },
  users: {
    all: ['users'] as const,
    list: () => ['users', 'list'] as const,
    detail: (id: number | string) => ['users', 'detail', id] as const,
  },
  students: {
    all: ['students'] as const,
    list: (page?: number) => ['students', 'list', page ?? 1] as const,
    detail: (id: number | string) => ['students', 'detail', id] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: () => ['courses', 'list'] as const,
    detail: (id: number | string) => ['courses', 'detail', id] as const,
  },
  companies: {
    all: ['companies'] as const,
    list: () => ['companies', 'list'] as const,
    pending: () => ['companies', 'pending'] as const,
    detail: (id: number) => ['companies', 'detail', id] as const,
  },
  companyRequests: {
    all: ['company-requests'] as const,
    list: (status?: string) => ['company-requests', 'list', status ?? 'all'] as const,
  },
  geocode: {
    all: ['geocode'] as const,
    mindanao: (query: string) => ['geocode', 'mindanao', query] as const,
  },
  roles: {
    all: ['roles'] as const,
    list: () => ['roles', 'list'] as const,
    detail: (id: string | number) => ['roles', 'detail', id] as const,
  },
  majors: {
    all: ['majors'] as const,
    list: (courseId?: string | number) => ['majors', 'list', courseId ?? 'all'] as const,
    detail: (id: string | number) => ['majors', 'detail', id] as const,
  },
  coordinators: {
    all: ['coordinators'] as const,
    list: () => ['coordinators', 'list'] as const,
    detail: (id: string | number) => ['coordinators', 'detail', id] as const,
  },
  schoolYears: {
    all: ['school-years'] as const,
    list: () => ['school-years', 'list'] as const,
    detail: (id: string | number) => ['school-years', 'detail', id] as const,
  },
  sections: {
    all: ['sections'] as const,
    bySchoolYear: (syId: string | number) => ['sections', 'school-year', syId] as const,
    detail: (id: string | number) => ['sections', 'detail', id] as const,
  },
 notifications: {
    all: ['notifications'] as const,
    list: () => ['notifications', 'list'] as const,
    unread: (userId?: number) => ['notifications', 'unread', userId ?? 'all'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },

  evaluations: {
    all: ['evaluations'] as const,
    templates: () => ['evaluations', 'templates'] as const,
    templateDetail: (id: string | number) => ['evaluations', 'templates', id] as const,
  },
}