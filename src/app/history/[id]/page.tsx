// Shows the saved answer review for one QuizMart attempt.

import Link from "next/link";
import { notFound } from "next/navigation";
import { QuizReview } from "@/components/quiz/QuizReview";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { quizSettings, quizText } from "@/config";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type HistoryDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function HistoryDetailPage({ params }: HistoryDetailProps) {
  const { id } = await params;
  const attempt = await getPrisma().attempt.findUnique({
    where: { id },
    include: {
      answers: {
        orderBy: { createdAt: "asc" },
        include: { question: { include: { choices: true } }, choice: true },
      },
    },
  });

  if (!attempt) {
    notFound();
  }

  const questions = attempt.answers.map((answer) => {
    const correctChoice = answer.question.choices.find((choice) => choice.isCorrect);
    return {
      questionId: answer.questionId,
      questionText: answer.question.text,
      correctAnswerText: correctChoice?.text ?? "",
      userAnswerText: answer.choice.text,
      isCorrect: answer.isCorrect,
    };
  });

  return (
    <main className="quiz-shell">
      <Card className="quiz-card w-full max-w-4xl">
        <CardContent className="space-y-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link className="quiz-text-link" href="/">{quizText.backToHomeLink}</Link>
            <Button className="quiz-button quiz-button-blue" asChild>
              <Link href="/">{quizText.takeQuizButton}</Link>
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-semibold">{quizText.historyHeading}</h1>
            <p className="mt-2 text-(--quiz-muted-text)">
              {quizText.totalScoreLabel}: {attempt.score} / {attempt.totalQuestions ?? quizSettings.questionCount} points · {attempt.correctCount} {quizText.correctCountLabel.toLowerCase()} · {attempt.wrongCount} {quizText.wrongCountLabel.toLowerCase()}
            </p>
          </div>
          <QuizReview questions={questions} />
        </CardContent>
      </Card>
    </main>
  );
}
