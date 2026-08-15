export type Role = "teacher" | "hod" | "student";

export interface Teacher {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface StudentRow {
  id: string;
  name: string;
  roll_no: string;
  class_id: string;
  email: string;
}

export interface ClassRow {
  id: string;
  name: string;
}

export interface SubjectRow {
  id: string;
  name: string;
  code: string;
}

export interface Assignment {
  id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  subjects?: SubjectRow;
  classes?: ClassRow;
}

export interface ScheduleRow {
  id: string;
  assignment_id: string;
  day_of_week: number; // 0=Sun..6=Sat
  start_time: string;
  end_time: string;
  room: string | null;
}

export const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
