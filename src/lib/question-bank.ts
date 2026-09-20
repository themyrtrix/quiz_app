// Keeps the active database question bank synchronized with prisma/questions.json.

import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import { loadQuestionFile, validateQuestionFile } from "@/lib/question-file";

function questionHash(questions: Awaited<ReturnType<typeof loadQuestionFile>>) {
  return createHash("sha256").update(JSON.stringify(questions)).digest("hex");
}

export async function syncQuestionBank() {
  const questions = await loadQuestionFile();
  validateQuestionFile(questions);
  const sourceHash = questionHash(questions);
  const prisma = getPrisma();
  const bank = await prisma.questionBank.findUnique({ where: { id: 1 } });

  if (bank?.sourceHash === sourceHash) return;

  await prisma.$transaction(async (tx) => {
    await tx.question.updateMany({ data: { isActive: false } });
    for (const question of questions) {
      await tx.question.create({
        data: {
          text: question.text,
          choices: {
            create: question.choices.map((choice, index) => ({
              text: choice,
              isCorrect: index === question.correctIndex,
            })),
          },
        },
      });
    }
    await tx.questionBank.upsert({
      where: { id: 1 },
      create: { id: 1, sourceHash },
      update: { sourceHash },
    });
  });
}
