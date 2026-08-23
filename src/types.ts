export type Role = {
  id: number
  name: string
  label: string
}

export type User = {
  id: number
  name: string
  email: string
  is_active: boolean
  role: Role | null
  role_id: number | string
  course: Course | null
  course_id: string
  section?: {
    id: number
    name: string
    code: string | null
  } | null
}

export type GeofencePolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

export type Company = {
  id: number
  company_request_id?: number | null
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  geofence_radius_meters: number | null
  geofence_enabled: boolean
  geofence_polygon: GeofencePolygon | null
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  is_active?: boolean
  is_approved?: boolean
  created_at?: string
  students?: Student[]
  supervisors?: Supervisor[]
}

export type CompanyRequest = {
  id: number
  name: string
  address: string | null
  latitude: number
  longitude: number
  status: 'pending' | 'accepted' | 'approved' | 'rejected'
  created_at: string
  company_id: number | null
  company_is_approved?: boolean | null
  geofence_polygon: GeofencePolygon | null
  user: {
    id: number
    name: string
    email: string
  } | null
}

export type LoginResponse = {
  token_type: string
  access_token: string
  expires_at: string | null
  user: User
}

export type Course = {
  id: string | number
  code: string
  name: string
  required_hours: number
  is_active: boolean
  dean_user_id: string | number
  dean: User | null
  majors?: Major[]
}

export type Major = {
  id: string | number
  course_id: string | number
  name: string
  code: string
  program_head_user_id: string | number | null
  sort_order: number | null
  program_head: User | null
  course: Course | null
}

export type Student = {
  id: number
  student_number: string
  first_name: string
  middle_name: string | null
  last_name: string
  section_id: number
  is_active: boolean
  companies?: Company[]
}

export type Supervisor = {
  id: number
  user_id: number
  company_id: number
  position_title: string | null
  is_active: boolean
  user: {
    id: number
    name: string
    email: string
  } | null
}

export type Section = {
  id: number
  course_id: number
  course_major_id: number | null
  school_year_id: number
  name: string
  code: string | null
  coordinator_user_id: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  students: Student[]
  course: Course | null
  course_major: Major | null
  coordinator: User | null
  school_year: SchoolYear | null
}

export type SchoolYear = {
  id: number
  name: string
  start_date: string | null
  end_date: string | null
  is_active: boolean
}
