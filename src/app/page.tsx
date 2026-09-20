// Loads quiz questions without correct answers and renders the QuizMart app.

import { QuizClient, type QuizQuestion } from "@/components/quiz/QuizClient";
import { quizSettings } from "@/config";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getQuizQuestions(): Promise<QuizQuestion[]> {
  const prisma = getPrisma();
  const questions = await prisma.question.findMany({
    take: quizSettings.questionCount,
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      text: true,
      choices: {
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          text: true,
        },
      },
    },
  });

  // Correct choices are deliberately not selected here, so they are never sent during the quiz.
  return questions;
}

export default async function Home() {
  const questions = await getQuizQuestions();

  return <QuizClient questions={questions} />;
}
