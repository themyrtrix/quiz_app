// Lists the latest saved QuizMart attempts.

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { quizText } from "@/config";
import { getPrisma } from "@/lib/prisma";
import { getLocalAttempts } from "@/lib/local-store";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function HistoryPage() {
  const attempts = process.env.DATABASE_MODE !== "remote"
    ? (await getLocalAttempts()).map((attempt) => ({ ...attempt, createdAt: new Date(attempt.createdAt) }))
    : await getPrisma().attempt.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, score: true, correctCount: true, wrongCount: true, totalQuestions: true, createdAt: true },
      });

  return (
    <main className="quiz-shell">
      <Card className="quiz-card w-full max-w-3xl">
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Button className="quiz-button quiz-button-white" asChild>
                <Link href="/">{quizText.backButton}</Link>
              </Button>
              <h1 className="mt-3 text-3xl font-semibold">{quizText.historyHeading}</h1>
            </div>
            <Button className="quiz-button quiz-button-blue" asChild>
              <Link href="/">{quizText.takeQuizButton}</Link>
            </Button>
          </div>
          <Separator />

          {attempts.length === 0 ? (
            <div className="quiz-empty-state">
              <p>{quizText.noAttemptsMessage}</p>
              <Button className="quiz-button quiz-button-blue" asChild>
                <Link href="/">{quizText.startButton}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <Link className="quiz-history-row" href={`/history/${attempt.id}`} key={attempt.id}>
                  <span>{formatDate(attempt.createdAt)}</span>
                  <strong>
                    <Badge variant="outline">{attempt.score} / {attempt.totalQuestions} points</Badge>
                  </strong>
                  <Badge variant="success">{attempt.correctCount} {quizText.correctCountLabel.toLowerCase()}</Badge>
                  <Badge variant="destructive">{attempt.wrongCount} {quizText.wrongCountLabel.toLowerCase()}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
