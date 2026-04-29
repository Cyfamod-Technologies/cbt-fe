import { QuizResults } from "@/app/(app)/cbt/_components/quiz-results";

interface AdminQuizResultsPageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function AdminQuizResultsPage({ params }: AdminQuizResultsPageProps) {
  const { assessmentId } = await params;

  return <QuizResults assessmentId={Number(assessmentId)} />;
}
