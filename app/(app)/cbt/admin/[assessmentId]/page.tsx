import { redirect } from "next/navigation";

interface LegacyCbtAdminAssessmentPageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function LegacyCbtAdminAssessmentPage({ params }: LegacyCbtAdminAssessmentPageProps) {
  const { assessmentId } = await params;

  redirect(`/cbt/admin/${assessmentId}/questions`);
}
