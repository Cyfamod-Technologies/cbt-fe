"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getStudentProfile, studentLogout, type StudentUser } from "@/lib/studentAuth";

interface StudentAuthContextValue {
  student: StudentUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const StudentAuthContext = createContext<StudentAuthContextValue | null>(null);

export function StudentAuthProvider({ children }: { children: React.ReactNode }) {
  const [student, setStudent] = useState<StudentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      setStudent(await getStudentProfile());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const logout = useCallback(async () => {
    await studentLogout();
    setStudent(null);
  }, []);

  const value = useMemo(
    () => ({ student, loading, refresh: loadProfile, logout }),
    [student, loading, loadProfile, logout],
  );

  return <StudentAuthContext.Provider value={value}>{children}</StudentAuthContext.Provider>;
}

export function useStudentAuth(): StudentAuthContextValue {
  const ctx = useContext(StudentAuthContext);
  if (!ctx) throw new Error("useStudentAuth must be used within StudentAuthProvider");
  return ctx;
}
