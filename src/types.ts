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
  buildings?: Building[]
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
  buildings?: Building[]
}

export type Building = {
  id: number
  company_id: number
  name: string
  code: string
  description: string | null
  latitude: number | null
  longitude: number | null
  geofence_radius_meters: number | null
  geofence_enabled: boolean
  geofence_polygon: GeofencePolygon | null
  is_active: boolean
  created_at: string
  updated_at: string
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
  program_head_id: string | number | null
  program_head: User | null
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

export type CompanySchedule = {
  id: number
  company_id: number
  supervisor_id: number | null
  start_date: string | null
  time_in: string | null
  lunch_break: string | null
  time_out: string | null
  creator?: {
    id: number
    position_title: string | null
    user: {
      id: number
      name: string
      email: string
    } | null
  } | null
}

export type TimeLog = {
  id: number
  student_id: number
  session_period: string
  task_note: string | null
  time_in: string
  time_out: string | null
  duration_minutes: number | null
  verification_method: string | null
  face_match_score: number | null
  device_info: string | null
  task_photos?: Array<{
    id: number
    photo_path: string
  }>
}

export type StudentDocument = {
  id: number
  student_id: number
  document_type_id: number
  file_path: string
  original_filename: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
  notes: string | null
  review_status: string
  reviewed_at: string | null
  rejection_reason: string | null
  document_type?: {
    id: number
    name: string
    code: string
  } | null
  document_requirement?: {
    id: number
    title: string
    description: string | null
  } | null
}

export type OjtSchedule = {
  id: number
  student_id: number
  hours_per_day: number
  days_per_week: number
  start_date: string | null
}

export type Student = {
  id: number
  student_number: string
  first_name: string
  middle_name: string | null
  last_name: string
  section_id: number
  is_active: boolean
  section?: Section | null
  companies?: (Company & { schedules?: CompanySchedule[] })[]
  ojt_schedule?: OjtSchedule | null
  time_logs?: TimeLog[]
  documents?: StudentDocument[]
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

export type Setting = {
  id?: number | null
  course_id?: number | null
  department_name?: string | null
  logo_path?: string | null
  logo_url?: string | null
  theme_color?: string
  theme_color_hover?: string | null
  theme_color_soft?: string | null
  updated_at?: string | null
}

export type ItemType = 'rating' | 'text' | 'textarea' | 'single_choice' | 'multiple_choice'

export interface EvaluationItemOption {
  min?: number
  max?: number
  choices?: string[]
  placeholder?: string
}

export interface EvaluationTemplateItem {
  id?: number
  item_type: ItemType
  label: string
  is_required: boolean
  options?: EvaluationItemOption
  sort_order?: number
}

export interface EvaluationTemplateFormData {
  title: string
  description: string
  course_ids: number[] // Replaces single section_id
  is_active: boolean
  items: EvaluationTemplateItem[]
}

export interface CourseOption {
  id: number
  title: string
  code: string
}

export interface EvaluationTemplate {
  id: number;
  title: string; // Updated from 'name' to match model attribute
  description?: string;
  is_active: boolean;
  courses?: Course[]; // Many-to-Many attached courses
  items?: EvaluationTemplateItem[];
  items_count?: number;
  created_at: string;
}

