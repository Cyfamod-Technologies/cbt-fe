import { CbtAttempt } from "@/app/(app)/cbt/_components/cbt-attempt";

interface TakeAssessmentPageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function TakeAssessmentPage({ params }: TakeAssessmentPageProps) {
  const { assessmentId } = await params;

  return <CbtAttempt assessmentId={Number(assessmentId)} />;
}
