import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadQuestionFile, validateQuestionFile, type SeedQuestion } from "@/lib/question-file";

type LocalChoice = {
  id: string;
  text: string;
  isCorrect: boolean;
  questionId: string;
};

export type LocalQuestion = {
  id: string;
  text: string;
  isActive: boolean;
  choices: LocalChoice[];
};

export type LocalAttemptAnswer = {
  questionId: string;
  choiceId: string;
  isCorrect: boolean;
};

export type LocalAttempt = {
  id: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  createdAt: string;
  answers: LocalAttemptAnswer[];
};

type LocalState = {
  sourceHash?: string;
  questions: LocalQuestion[];
  attempts: LocalAttempt[];
};

const dataDirectory = resolve(process.cwd(), ".data");
const dataFile = resolve(dataDirectory, "quiz-data.json");

async function readState(): Promise<LocalState> {
  try {
    const content = await readFile(dataFile, "utf8");
    const state = JSON.parse(content) as Partial<LocalState>;
    return {
      sourceHash: state.sourceHash,
      questions: state.questions ?? [],
      attempts: state.attempts ?? [],
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return { questions: [], attempts: [] };
  }
}

async function writeState(state: LocalState) {
  await mkdir(dataDirectory, { recursive: true });
  await writeFile(dataFile, JSON.stringify(state, null, 2), "utf8");
}

function questionHash(questions: SeedQuestion[]) {
  return createHash("sha256").update(JSON.stringify(questions)).digest("hex");
}

export async function syncLocalQuestionBank() {
  const questions = await loadQuestionFile();
  validateQuestionFile(questions);
  const sourceHash = questionHash(questions);
  const state = await readState();

  if (state.sourceHash === sourceHash) return state;

  const importedQuestions = questions.map((question, questionIndex) => {
    const id = `local-question-${sourceHash.slice(0, 12)}-${questionIndex}`;
    return {
      id,
      text: question.text,
      isActive: true,
      choices: question.choices.map((text, choiceIndex) => ({
        id: `${id}-choice-${choiceIndex}`,
        text,
        isCorrect: choiceIndex === question.correctIndex,
        questionId: id,
      })),
    };
  });

  const nextState = {
    sourceHash,
    questions: [
      ...state.questions.map((question) => ({ ...question, isActive: false })),
      ...importedQuestions,
    ],
    attempts: state.attempts,
  };
  await writeState(nextState);
  return nextState;
}

export async function getLocalQuestions() {
  const state = await syncLocalQuestionBank();
  return state.questions.filter((question) => question.isActive);
}

export async function getLocalQuestion(id: string) {
  const state = await readState();
  return state.questions.find((question) => question.id === id);
}

export async function createLocalAttempt(attempt: Omit<LocalAttempt, "id" | "createdAt">) {
  const state = await readState();
  const savedAttempt = {
    ...attempt,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await writeState({ ...state, attempts: [savedAttempt, ...state.attempts] });
  return savedAttempt;
}

export async function getLocalAttempts() {
  return (await readState()).attempts.slice(0, 50);
}

export async function getLocalAttempt(id: string) {
  return (await readState()).attempts.find((attempt) => attempt.id === id);
}
