"use server";

// Checks submitted answers on the server and saves anonymous quiz attempts.

import { getPrisma } from "@/lib/prisma";
import { quizSettings } from "@/config";
import { createLocalAttempt, getLocalQuestion } from "@/lib/local-store";

export type QuizSubmission = {
  questionId: string;
  choiceId: string;
};

export type QuizResultQuestion = {
  questionId: string;
  questionText: string;
  correctAnswerText: string;
  userAnswerText: string;
  isCorrect: boolean;
};

export type QuizResult = {
  attemptId: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  questions: QuizResultQuestion[];
};

export async function checkAnswer(answer: QuizSubmission): Promise<{ isCorrect: boolean }> {
  if (process.env.DATABASE_MODE !== "remote") {
    const question = await getLocalQuestion(answer.questionId);
    const selectedChoice = question?.choices.find((choice) => choice.id === answer.choiceId);
    const correctChoice = question?.choices.find((choice) => choice.isCorrect);
    if (!question || !selectedChoice || !correctChoice) {
      throw new Error("The selected answer could not be checked.");
    }
    return { isCorrect: selectedChoice.id === correctChoice.id };
  }

  const question = await getPrisma().question.findUnique({
    where: { id: answer.questionId },
    include: { choices: true },
  });
  const selectedChoice = question?.choices.find((choice) => choice.id === answer.choiceId);
  const correctChoice = question?.choices.find((choice) => choice.isCorrect);

  if (!question || !selectedChoice || selectedChoice.questionId !== question.id || !correctChoice) {
    throw new Error("The selected answer could not be checked.");
  }

  return { isCorrect: selectedChoice.id === correctChoice.id };
}

export async function submitQuiz(answers: QuizSubmission[]): Promise<QuizResult> {
  if (answers.length === 0) {
    throw new Error("Please answer at least one question before submitting.");
  }

  const questionIds = answers.map((answer) => answer.questionId);
  const uniqueQuestionIds = new Set(questionIds);

  if (uniqueQuestionIds.size !== answers.length) {
    throw new Error("Each question can only be answered once.");
  }

  if (process.env.DATABASE_MODE !== "remote") {
    const questions = await Promise.all(questionIds.map((id) => getLocalQuestion(id)));
    if (questions.some((question) => !question)) {
      throw new Error("One or more questions could not be found.");
    }
    const checkedAnswers = answers.map((answer, index) => {
      const question = questions[index]!;
      const selectedChoice = question.choices.find((choice) => choice.id === answer.choiceId);
      const correctChoice = question.choices.find((choice) => choice.isCorrect);
      if (!selectedChoice || !correctChoice) throw new Error("Selected choice could not be checked.");
      return { question, selectedChoice, correctChoice, isCorrect: selectedChoice.id === correctChoice.id };
    });
    const correctCount = checkedAnswers.filter((answer) => answer.isCorrect).length;
    const wrongCount = checkedAnswers.length - correctCount;
    const score = Math.max(0, correctCount * quizSettings.pointsForCorrectAnswer +
      wrongCount * quizSettings.pointsForWrongAnswer);
    const attempt = await createLocalAttempt({
      score,
      correctCount,
      wrongCount,
      totalQuestions: answers.length,
      answers: checkedAnswers.map(({ question, selectedChoice, isCorrect }) => ({
        questionId: question.id,
        choiceId: selectedChoice.id,
        isCorrect,
      })),
    });
    return {
      attemptId: attempt.id,
      score,
      correctCount,
      wrongCount,
      questions: checkedAnswers.map(({ question, selectedChoice, correctChoice, isCorrect }) => ({
        questionId: question.id,
        questionText: question.text,
        correctAnswerText: correctChoice.text,
        userAnswerText: selectedChoice.text,
        isCorrect,
      })),
    };
  }

  const prisma = getPrisma();
  const questions = await prisma.question.findMany({
    where: {
      id: {
        in: questionIds,
      },
    },
    include: {
      choices: true,
    },
  });

  if (questions.length !== answers.length) {
    throw new Error("One or more questions could not be found.");
  }

  const questionById = new Map(questions.map((question) => [question.id, question]));

  const checkedAnswers = answers.map((answer) => {
    const question = questionById.get(answer.questionId);

    if (!question) {
      throw new Error("Question not found.");
    }

    const selectedChoice = question.choices.find((choice) => choice.id === answer.choiceId);
    const correctChoice = question.choices.find((choice) => choice.isCorrect);

    if (!selectedChoice || selectedChoice.questionId !== question.id) {
      throw new Error("Selected choice does not belong to the question.");
    }

    if (!correctChoice) {
      throw new Error("Question is missing a correct answer.");
    }

    // Answer checking happens here on the server, after the browser sends only question and choice IDs.
    const isCorrect = selectedChoice.id === correctChoice.id;

    return {
      question,
      selectedChoice,
      correctChoice,
      isCorrect,
    };
  });

  const correctCount = checkedAnswers.filter((answer) => answer.isCorrect).length;
  const wrongCount = checkedAnswers.length - correctCount;
  const score = Math.max(
    0,
    correctCount * quizSettings.pointsForCorrectAnswer +
      wrongCount * quizSettings.pointsForWrongAnswer,
  );

  const attempt = await prisma.attempt.create({
    data: {
      score,
      correctCount,
      wrongCount,
      totalQuestions: answers.length,
      answers: {
        create: checkedAnswers.map((answer) => ({
          questionId: answer.question.id,
          choiceId: answer.selectedChoice.id,
          isCorrect: answer.isCorrect,
        })),
      },
    },
  });

  return {
    attemptId: attempt.id,
    score,
    correctCount,
    wrongCount,
    questions: checkedAnswers.map((answer) => ({
      questionId: answer.question.id,
      questionText: answer.question.text,
      correctAnswerText: answer.correctChoice.text,
      userAnswerText: answer.selectedChoice.text,
      isCorrect: answer.isCorrect,
    })),
  };
}
