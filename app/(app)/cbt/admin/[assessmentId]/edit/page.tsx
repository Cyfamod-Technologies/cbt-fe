import { QuizForm } from "@/app/(app)/cbt/_components/quiz-form";

interface EditQuizPageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function EditQuizPage({ params }: EditQuizPageProps) {
  const { assessmentId } = await params;

  return <QuizForm assessmentId={Number(assessmentId)} />;
}
