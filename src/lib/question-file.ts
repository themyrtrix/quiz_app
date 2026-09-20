// Parses flexible teacher question files for automatic question-bank syncing.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export type SeedQuestion = {
  text: string;
  choices: string[];
  correctIndex: number;
};

type QuestionFileItem = Record<string, unknown>;

function asRecord(value: unknown): QuestionFileItem | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as QuestionFileItem
    : null;
}

function firstValue(record: QuestionFileItem, keys: string[]) {
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
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return null;

  for (const key of ["questions", "items", "results", "data"]) {
    const nested = findQuestionArray(record[key]);
    if (nested) return nested;
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
  const rawCorrectIndex = firstValue(item, ["correctindex"]);
  const rawCorrectAnswer = firstValue(item, ["correctanswer", "correct", "answer"]);
  const correctIndex = rawCorrectIndex !== undefined && Number.isInteger(Number(rawCorrectIndex))
    ? Number(rawCorrectIndex)
    : choices.findIndex((choice) => choice.toLowerCase() === String(rawCorrectAnswer).trim().toLowerCase());

  if (typeof text !== "string" || !text.trim()) {
    throw new Error(`Question ${index + 1} is missing question text.`);
  }

  return { text: text.trim(), choices, correctIndex };
}

export async function loadQuestionFile(fileName = "prisma/questions.json") {
  const file = await readFile(resolve(process.cwd(), fileName), "utf8");
  const parsed = fileName.toLowerCase().endsWith(".csv") ? parseCsv(file) : JSON.parse(file) as unknown;
  const items = findQuestionArray(parsed);
  if (!items) throw new Error(`Question file ${fileName} must contain a question array.`);

  const questions = items.map((item, index) => {
    const record = asRecord(item);
    if (!record) throw new Error(`Question ${index + 1} must be an object or CSV row.`);
    return normalizeQuestion(record, index);
  });

  return questions;
}

export function validateQuestionFile(questions: SeedQuestion[]) {
  if (questions.length === 0) {
    throw new Error("The question file must contain at least one question.");
  }
  for (const [index, question] of questions.entries()) {
    if (!question.text.trim() || question.choices.length < 2 || question.choices.length > 6 ||
      question.choices.some((choice) => !choice.trim()) ||
      !Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex >= question.choices.length) {
      throw new Error(`Question ${index + 1} must have text, 2-6 choices, and a valid correct answer.`);
    }
  }
}
