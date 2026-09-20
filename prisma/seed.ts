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
  [key: string]: unknown;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function firstValue(record: Record<string, unknown>, keys: string[]) {
  const entry = Object.entries(record).find(([key]) => keys.includes(key.toLowerCase()));
  return entry?.[1];
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value.trim());
  return values;
}

function parseCsv(content: string) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) {
    throw new Error("CSV question files must include a header row and at least one question.");
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function findQuestionArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) {
    return value;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  for (const key of ["questions", "items", "results", "data"]) {
    const nested = findQuestionArray(record[key]);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function normalizeQuestion(item: QuestionFileItem, index: number): SeedQuestion {
  const text = firstValue(item, ["question", "text", "prompt", "title"]);
  const rawChoices = firstValue(item, ["choices", "options", "answers", "alternatives"]);
  const choices = Array.isArray(rawChoices)
    ? rawChoices.map((choice) => {
        const record = asRecord(choice);
        return typeof choice === "string"
          ? choice
          : String(firstValue(record ?? {}, ["text", "answer", "label", "value"]) ?? "");
      })
    : typeof rawChoices === "string"
      ? rawChoices.split("|").map((choice) => choice.trim())
      : [];
  const rawCorrect = firstValue(item, ["correctindex", "correctanswer", "correct", "answer"]);
  const correctIndex = Number.isInteger(Number(rawCorrect))
    ? Number(rawCorrect)
    : choices.findIndex((choice) => choice.toLowerCase() === String(rawCorrect).trim().toLowerCase());

  if (typeof text !== "string" || !text.trim()) {
    throw new Error(`Question ${index + 1} is missing a question, text, prompt, or title field.`);
  }

  return { text: text.trim(), choices, correctIndex };
}

async function loadFallbackQuestions() {
  // EDIT: replace prisma/questions.json with teacher-provided questions, then run npm run prisma:seed.
  const questionFile = process.env.QUESTION_FILE ?? "prisma/questions.json";
  const file = await readFile(resolve(process.cwd(), questionFile), "utf8");
  const parsed = questionFile.toLowerCase().endsWith(".csv")
    ? parseCsv(file)
    : JSON.parse(file) as unknown;
  const items = findQuestionArray(parsed);

  if (!items) {
    throw new Error(`Question file ${questionFile} must contain an array or a questions/items/results/data array.`);
  }

  return items.map((item, index) => {
    const record = asRecord(item);
    if (!record) {
      throw new Error(`Question ${index + 1} must be an object or CSV row.`);
    }
    return normalizeQuestion(record, index);
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
