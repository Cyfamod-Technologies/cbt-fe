import { redirect } from "next/navigation";

interface LegacyAttemptPageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function LegacyAttemptPage({ params }: LegacyAttemptPageProps) {
  const { assessmentId } = await params;

  redirect(`/cbt/${assessmentId}/take`);
}
