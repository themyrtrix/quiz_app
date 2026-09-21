// Loads quiz questions without correct answers and renders the QuizMart app.

import { QuizClient, type QuizQuestion } from "@/components/quiz/QuizClient";
import { getPrisma } from "@/lib/prisma";
import { syncQuestionBank } from "@/lib/question-bank";
import { getLocalQuestions } from "@/lib/local-store";

export const dynamic = "force-dynamic";

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

async function getQuizQuestions(): Promise<QuizQuestion[]> {
  if (process.env.DATABASE_MODE !== "remote") {
    const questions = await getLocalQuestions();
    return shuffle(questions).map((question) => ({
      id: question.id,
      text: question.text,
      choices: shuffle(question.choices.map(({ id, text }) => ({ id, text }))),
    }));
  }

  await syncQuestionBank();
  const prisma = getPrisma();
  const questions = await prisma.question.findMany({
    where: { isActive: true },
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
  return shuffle(questions).map((question) => ({
    ...question,
    choices: shuffle(question.choices),
  }));
}

export default async function Home() {
  const questions = await getQuizQuestions();

  return <QuizClient questions={questions} />;
}
