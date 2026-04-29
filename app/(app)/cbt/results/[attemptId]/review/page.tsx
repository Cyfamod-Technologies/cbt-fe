import { QuizResults } from "@/app/(app)/cbt/_components/quiz-results";

interface ReviewPageProps {
  params: Promise<{ attemptId: string }>;
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { attemptId } = await params;

  return <QuizResults attemptId={Number(attemptId)} review />;
}
