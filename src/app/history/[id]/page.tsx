// Shows the saved answer review for one QuizMart attempt.

import Link from "next/link";
import { notFound } from "next/navigation";
import { QuizReview } from "@/components/quiz/QuizReview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { quizText } from "@/config";
import { getPrisma } from "@/lib/prisma";
import { getLocalAttempt, getLocalQuestion } from "@/lib/local-store";

export const dynamic = "force-dynamic";

type HistoryDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function HistoryDetailPage({ params }: HistoryDetailProps) {
  const { id } = await params;
  const attempt = process.env.DATABASE_MODE !== "remote"
    ? await getLocalAttempt(id)
    : await getPrisma().attempt.findUnique({
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

  const questions = process.env.DATABASE_MODE !== "remote"
    ? await Promise.all(attempt.answers.map(async (answer) => {
      const question = await getLocalQuestion(answer.questionId);
      const selectedChoice = question?.choices.find((choice) => choice.id === answer.choiceId);
      const correctChoice = question?.choices.find((choice) => choice.isCorrect);
      return {
        questionId: answer.questionId,
        questionText: question?.text ?? "",
        correctAnswerText: correctChoice?.text ?? "",
        userAnswerText: selectedChoice?.text ?? "",
        isCorrect: answer.isCorrect,
      };
    }))
    : attempt.answers.map((answer) => {
    if (!("question" in answer)) {
      throw new Error("Stored history entry is missing its question.");
    }
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
            <Button className="quiz-button quiz-button-white" asChild>
              <Link href="/history">{quizText.backButton}</Link>
            </Button>
            <Button className="quiz-button quiz-button-blue" asChild>
              <Link href="/">{quizText.takeQuizButton}</Link>
            </Button>
          </div>
          <div>
            <h1 className="text-3xl font-semibold">{quizText.historyHeading}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-(--quiz-muted-text)">
              <Badge variant="outline">{quizText.totalScoreLabel}: {attempt.score} / {attempt.totalQuestions} points</Badge>
              <Badge variant="success">{attempt.correctCount} {quizText.correctCountLabel.toLowerCase()}</Badge>
              <Badge variant="destructive">{attempt.wrongCount} {quizText.wrongCountLabel.toLowerCase()}</Badge>
            </div>
          </div>
          <Separator />
          <QuizReview questions={questions} />
        </CardContent>
      </Card>
    </main>
  );
}
