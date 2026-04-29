import { apiFetch } from "@/lib/apiClient";

export interface AcademicSession {
  id: number;
  school_id: number;
  name: string;
  is_current: boolean;
  status: string;
}

export interface Semester {
  id: number;
  school_id: number;
  name: string;
  status: string;
}

export interface Department {
  id: number;
  school_id: number;
  name: string;
  code: string | null;
  status: string;
}

export interface Level {
  id: number;
  school_id: number;
  name: string;
  status: string;
}

export interface Course {
  id: number;
  school_id: number;
  code: string;
  title: string;
  department_id: number;
  level_id: number;
  semester_id: number;
  status: string;
  department?: Department;
  level?: Level;
  semester?: Semester;
}

export interface SchoolSettings {
  id: number;
  school_id: number;
  current_session_id: number | null;
  current_semester_id: number | null;
  current_session?: AcademicSession | null;
  current_semester?: Semester | null;
}

type CollectionResponse<T> = { data: T[] };
type ItemResponse<T> = { data: T };

export async function listSessions() {
  return (await apiFetch<CollectionResponse<AcademicSession>>("/api/v1/sessions")).data;
}

export async function createSession(payload: { name: string; is_current?: boolean }) {
  return (await apiFetch<ItemResponse<AcademicSession>>("/api/v1/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  })).data;
}

export async function setCurrentSession(id: number) {
  return (await apiFetch<ItemResponse<AcademicSession>>(`/api/v1/sessions/${id}/current`, {
    method: "PATCH",
  })).data;
}

export async function listSemesters() {
  return (await apiFetch<CollectionResponse<Semester>>("/api/v1/semesters")).data;
}

export async function createSemester(payload: { name: string }) {
  return (await apiFetch<ItemResponse<Semester>>("/api/v1/semesters", {
    method: "POST",
    body: JSON.stringify(payload),
  })).data;
}

export async function setCurrentSemester(id: number) {
  return (await apiFetch<ItemResponse<Semester>>(`/api/v1/semesters/${id}/current`, {
    method: "PATCH",
  })).data;
}

export async function listDepartments() {
  return (await apiFetch<CollectionResponse<Department>>("/api/v1/departments")).data;
}

export async function createDepartment(payload: { name: string; code?: string }) {
  return (await apiFetch<ItemResponse<Department>>("/api/v1/departments", {
    method: "POST",
    body: JSON.stringify(payload),
  })).data;
}

export async function listLevels() {
  return (await apiFetch<CollectionResponse<Level>>("/api/v1/levels")).data;
}

export async function createLevel(payload: { name: string }) {
  return (await apiFetch<ItemResponse<Level>>("/api/v1/levels", {
    method: "POST",
    body: JSON.stringify(payload),
  })).data;
}

export async function listCourses() {
  return (await apiFetch<CollectionResponse<Course>>("/api/v1/courses")).data;
}

export async function createCourse(payload: {
  code: string;
  title: string;
  department_id: number;
  level_id: number;
  semester_id: number;
}) {
  return (await apiFetch<ItemResponse<Course>>("/api/v1/courses", {
    method: "POST",
    body: JSON.stringify(payload),
  })).data;
}

export async function getSchoolSettings() {
  return (await apiFetch<ItemResponse<SchoolSettings>>("/api/v1/school-settings")).data;
}
