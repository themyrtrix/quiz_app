// Validates and imports the local teacher question file.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadQuestionFile, validateQuestionFile } from "../src/lib/question-file";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing.");
}

const databaseUrlWithCompat = new URL(databaseUrl);
if (databaseUrlWithCompat.searchParams.get("sslmode") === "require" &&
    !databaseUrlWithCompat.searchParams.has("uselibpqcompat")) {
  databaseUrlWithCompat.searchParams.set("uselibpqcompat", "true");
}

const adapter = new PrismaPg({ connectionString: databaseUrlWithCompat.toString() });
const prisma = new PrismaClient({ adapter });

async function main() {
  const questionFile = "prisma/questions.json";
  const questions = await loadQuestionFile(questionFile);
  validateQuestionFile(questions);
  console.log(`Validated ${questions.length} questions from ${questionFile}.`);

  if (process.env.VALIDATE_ONLY === "true") {
    console.log("No database changes made.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.attemptAnswer.deleteMany();
    await tx.attempt.deleteMany();
    await tx.choice.deleteMany();
    await tx.question.deleteMany();

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
  });

  console.log(`Imported ${questions.length} questions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
