// Loads QuizMart questions from a local JSON file, with Open Trivia available as an opt-in source.

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { decode } from "html-entities";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { quizSettings } from "../src/config";

type SeedQuestion = {
  text: string;
  choices: string[];
  correctIndex: number;
};

type QuestionFileItem = {
  question?: unknown;
  text?: unknown;
  choices?: unknown;
  correctIndex?: unknown;
};

type OpenTriviaQuestion = {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
};

type OpenTriviaResponse = {
  response_code: number;
  results: OpenTriviaQuestion[];
};

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

async function loadFallbackQuestions() {
  // EDIT: replace prisma/questions.json with teacher-provided questions, then run npm run prisma:seed.
  const questionFile = process.env.QUESTION_FILE ?? "prisma/questions.json";
  const file = await readFile(resolve(process.cwd(), questionFile), "utf8");
  const parsed = JSON.parse(file) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(`Question file ${questionFile} must contain a JSON array.`);
  }

  return parsed.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Question ${index + 1} must be an object.`);
    }

    const question = item as QuestionFileItem;

    return {
      text: question.question ?? question.text,
      choices: question.choices,
      correctIndex: question.correctIndex,
    } as SeedQuestion;
  });
}

async function fetchOpenTriviaQuestions() {
  const url = `https://opentdb.com/api.php?amount=${quizSettings.questionCount}&type=multiple`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open Trivia DB returned ${response.status}`);
  }

  const data = (await response.json()) as OpenTriviaResponse;

  if (data.response_code !== 0 || data.results.length !== quizSettings.questionCount) {
    throw new Error(`Open Trivia DB response code ${data.response_code}`);
  }

  return data.results.map((item) => {
    const correctAnswer = decode(item.correct_answer);
    const shuffledChoices = shuffle([
      correctAnswer,
      ...item.incorrect_answers.map((answer) => decode(answer)),
    ]);

    return {
      text: decode(item.question),
      choices: shuffledChoices,
      correctIndex: shuffledChoices.indexOf(correctAnswer),
    };
  });
}

function validateQuestions(questions: SeedQuestion[]) {
  if (questions.length !== quizSettings.questionCount) {
    throw new Error(`Expected ${quizSettings.questionCount} questions, found ${questions.length}.`);
  }

  for (const [index, question] of questions.entries()) {
    if (typeof question.text !== "string" || question.text.trim() === "") {
      throw new Error(`Question ${index + 1} must have a non-empty question field.`);
    }

    if (!Array.isArray(question.choices) || question.choices.some((choice) => typeof choice !== "string")) {
      throw new Error(`Question ${index + 1} must have four string choices.`);
    }

    if (question.choices.length !== 4) {
      throw new Error(`Question ${index + 1} must have exactly four choices.`);
    }

    if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) {
      throw new Error(`Question ${index + 1} has an invalid correctIndex.`);
    }
  }
}

async function main() {
  let questions: SeedQuestion[];

  if (process.env.USE_OPEN_TRIVIA === "true") {
    // The seed fetches exactly once per run to respect Open Trivia DB's rate limit.
    questions = await fetchOpenTriviaQuestions();
    console.log("Loaded questions from Open Trivia DB.");
  } else {
    const questionFile = process.env.QUESTION_FILE ?? "prisma/questions.json";
    questions = await loadFallbackQuestions();
    console.log(`Loaded questions from ${questionFile}.`);
  }

  validateQuestions(questions);

  if (process.env.VALIDATE_ONLY === "true") {
    console.log(`Validated ${questions.length} questions. No database changes made.`);
    return;
  }

  // Re-seeding starts fresh so edited fallback questions or newly fetched questions replace the old set.
  await prisma.attemptAnswer.deleteMany();
  await prisma.attempt.deleteMany();
  await prisma.choice.deleteMany();
  await prisma.question.deleteMany();

  for (const question of questions) {
    await prisma.question.create({
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

  console.log(`Seeded ${questions.length} questions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
