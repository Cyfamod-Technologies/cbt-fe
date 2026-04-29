import { QuizResults } from "@/app/(app)/cbt/_components/quiz-results";

interface ResultPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function ResultPage({ params }: ResultPageProps) {
  const { attemptId } = await params;

  return <QuizResults attemptId={Number(attemptId)} />;
}
