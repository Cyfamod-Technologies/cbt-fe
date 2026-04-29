import { QuestionManager } from "@/app/(app)/cbt/_components/question-manager";

interface QuestionsPageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function QuestionsPage({ params }: QuestionsPageProps) {
  const { assessmentId } = await params;

  return <QuestionManager assessmentId={Number(assessmentId)} />;
}
