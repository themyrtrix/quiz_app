"use client";

// Renders the start, question, and results screens for QuizMart.

import { useMemo, useState, useTransition } from "react";
import { submitQuiz, type QuizResult } from "@/actions/quiz";
import { quizSettings, quizText } from "@/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type QuizQuestion = {
  id: string;
  text: string;
  choices: {
    id: string;
    text: string;
  }[];
};

type QuizClientProps = {
  questions: QuizQuestion[];
};

type Screen = "start" | "quiz" | "results";
type ResultsFilter = "all" | "wrong";

const titleTileClasses = [
  "quiz-title-tile-blue -rotate-6",
  "quiz-title-tile-yellow rotate-3",
  "quiz-title-tile-white -rotate-2",
  "quiz-title-tile-blue rotate-6",
  "quiz-title-tile-yellow -rotate-3",
  "quiz-title-tile-white rotate-2",
  "quiz-title-tile-blue -rotate-4",
  "quiz-title-tile-yellow rotate-5",
];

function formatScore(score: number) {
  // Negative scores use the true minus sign requested in the spec.
  return `${score < 0 ? `−${Math.abs(score)}` : score} points`;
}

function QuizTitle() {
  return (
    <h1 className="flex flex-wrap justify-center gap-2 text-5xl font-black sm:text-7xl" aria-label={quizText.title}>
      {quizText.title.toUpperCase().split("").map((letter, index) => (
        <span
          className={cn("quiz-title-tile", titleTileClasses[index % titleTileClasses.length])}
          key={`${letter}-${index}`}
          aria-hidden="true"
        >
          {letter}
        </span>
      ))}
    </h1>
  );
}

export function QuizClient({ questions }: QuizClientProps) {
  const [screen, setScreen] = useState<Screen>("start");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [lockedAnswers, setLockedAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [resultsFilter, setResultsFilter] = useState<ResultsFilter>("all");
  const [errorMessage, setErrorMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const currentQuestion = questions[currentIndex];
  const currentLockedChoiceId = currentQuestion ? lockedAnswers[currentQuestion.id] : undefined;
  const currentDraftChoiceId = currentQuestion ? draftAnswers[currentQuestion.id] : undefined;
  const currentChoiceId = currentLockedChoiceId ?? currentDraftChoiceId ?? "";
  const lockedCount = Object.keys(lockedAnswers).length;
  // EDIT: progress math lives here if you want a different progress behavior later.
  const progressValue = (lockedCount / quizSettings.questionCount) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;
  const canContinue = Boolean(currentChoiceId) && !isPending;

  const visibleResultQuestions = useMemo(() => {
    if (!result) {
      return [];
    }

    return resultsFilter === "wrong"
      ? result.questions.filter((question) => !question.isCorrect)
      : result.questions;
  }, [result, resultsFilter]);

  function resetQuiz() {
    setScreen("start");
    setCurrentIndex(0);
    setDraftAnswers({});
    setLockedAnswers({});
    setResult(null);
    setResultsFilter("all");
    setErrorMessage("");
  }

  function handleStart() {
    setScreen("quiz");
  }

  function handleChoiceChange(choiceId: string) {
    if (!currentQuestion || currentLockedChoiceId) {
      return;
    }

    setDraftAnswers((answers) => ({
      ...answers,
      [currentQuestion.id]: choiceId,
    }));
  }

  function buildSubmission(nextLockedAnswers: Record<string, string>) {
    return questions.map((question) => ({
      questionId: question.id,
      choiceId: nextLockedAnswers[question.id],
    }));
  }

  function handleNext() {
    if (!currentQuestion || !canContinue) {
      return;
    }

    const nextLockedAnswers = currentLockedChoiceId
      ? lockedAnswers
      : {
          ...lockedAnswers,
          [currentQuestion.id]: currentChoiceId,
        };

    // Pressing Next locks the answer. Going back later only reviews this saved choice.
    setLockedAnswers(nextLockedAnswers);
    setErrorMessage("");

    if (isLastQuestion) {
      startTransition(async () => {
        try {
          const submission = buildSubmission(nextLockedAnswers);
          const nextResult = await submitQuiz(submission);
          setResult(nextResult);
          setScreen("results");
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
        }
      });
      return;
    }

    setCurrentIndex((index) => index + 1);
  }

  function handleBack() {
    if (currentIndex === 0 || isPending) {
      return;
    }

    setCurrentIndex((index) => index - 1);
    setErrorMessage("");
  }

  if (questions.length === 0) {
    return (
      <main className="quiz-shell">
        <Card className="quiz-card max-w-xl">
          <CardContent className="space-y-4 text-center">
            <QuizTitle />
            <p className="text-lg font-bold">No questions found. Run the migration and seed scripts.</p>
          </CardContent>
        </Card>
        <footer className="quiz-footer">{quizText.footerCredit}</footer>
      </main>
    );
  }

  if (screen === "start") {
    return (
      <main className="quiz-shell">
        <section className="flex flex-col items-center gap-7 text-center">
          <QuizTitle />
          <p className="max-w-md text-2xl font-extrabold text-[var(--quiz-navy)] dark:text-[var(--quiz-dark-text)]">
            {quizText.tagline}
          </p>
          <Button className="quiz-button quiz-button-yellow text-xl" onClick={handleStart}>
            {quizText.startButton}
          </Button>
        </section>
        <footer className="quiz-footer">{quizText.footerCredit}</footer>
      </main>
    );
  }

  if (screen === "results" && result) {
    return (
      <main className="quiz-shell">
        <Card className="quiz-card w-full max-w-4xl">
          <CardContent className="space-y-7">
            <div className="space-y-3 text-center">
              <QuizTitle />
              <h2 className="text-3xl font-black text-[var(--quiz-navy)] dark:text-[var(--quiz-dark-text)]">
                {quizText.resultsHeading}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="quiz-stat">
                <span>{quizText.totalScoreLabel}</span>
                <strong>{formatScore(result.score)}</strong>
              </div>
              <div className="quiz-stat quiz-stat-correct">
                <span>{quizText.correctCountLabel}</span>
                <strong>{result.correctCount}</strong>
              </div>
              <div className="quiz-stat quiz-stat-wrong">
                <span>{quizText.wrongCountLabel}</span>
                <strong>{result.wrongCount}</strong>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-3" aria-label="Results filter">
              <Button
                className={cn("quiz-toggle", resultsFilter === "all" && "quiz-toggle-active")}
                type="button"
                variant="outline"
                onClick={() => setResultsFilter("all")}
              >
                {quizText.allQuestionsToggle}
              </Button>
              <Button
                className={cn("quiz-toggle", resultsFilter === "wrong" && "quiz-toggle-active")}
                type="button"
                variant="outline"
                onClick={() => setResultsFilter("wrong")}
              >
                {quizText.wrongOnlyToggle}
              </Button>
            </div>

            <div className="space-y-4">
              {visibleResultQuestions.length === 0 ? (
                <p className="rounded-[var(--quiz-radius)] border-[3px] border-[var(--quiz-navy)] bg-white p-4 text-center font-extrabold shadow-[var(--quiz-small-shadow)] dark:border-[var(--quiz-dark-border)] dark:bg-[var(--quiz-dark-card)]">
                  {quizText.noWrongAnswers}
                </p>
              ) : (
                visibleResultQuestions.map((question, index) => (
                  <article className="quiz-result-row" key={question.questionId}>
                    <h3>
                      {index + 1}. {question.questionText}
                    </h3>
                    <p className="quiz-answer-correct">
                      <span>{quizText.correctAnswerLabel}:</span> {question.correctAnswerText}
                    </p>
                    {!question.isCorrect ? (
                      <p className="quiz-answer-wrong">
                        <span>{quizText.yourAnswerLabel}:</span> {question.userAnswerText}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>

            <div className="flex justify-center">
              <Button className="quiz-button quiz-button-yellow text-lg" onClick={resetQuiz}>
                {quizText.playAgainButton}
              </Button>
            </div>
          </CardContent>
        </Card>
        <footer className="quiz-footer">{quizText.footerCredit}</footer>
      </main>
    );
  }

  return (
    <main className="quiz-shell">
      <Card className="quiz-card w-full max-w-3xl">
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Progress
              aria-label="Quiz progress"
              className="quiz-progress"
              value={progressValue}
            />
            <span className="shrink-0 text-center text-lg font-black text-[var(--quiz-navy)] dark:text-[var(--quiz-dark-text)]">
              {quizText.questionLabel} {currentIndex + 1} / {quizSettings.questionCount}
            </span>
          </div>

          <div className="quiz-question-box">
            <h2>{currentQuestion.text}</h2>
          </div>

          <RadioGroup
            className="gap-3"
            disabled={Boolean(currentLockedChoiceId) || isPending}
            onValueChange={handleChoiceChange}
            value={currentChoiceId}
          >
            {currentQuestion.choices.map((choice) => (
              <label className="quiz-choice" key={choice.id}>
                <RadioGroupItem className="quiz-radio" value={choice.id} />
                <span>{choice.text}</span>
              </label>
            ))}
          </RadioGroup>

          {errorMessage ? <p className="quiz-error">{errorMessage}</p> : null}
        </CardContent>
        <CardFooter className="quiz-card-footer">
          <Button
            className="quiz-button quiz-button-white"
            disabled={currentIndex === 0 || isPending}
            onClick={handleBack}
            type="button"
            variant="outline"
          >
            {quizText.backButton}
          </Button>
          <Button
            className="quiz-button quiz-button-blue"
            disabled={!canContinue}
            onClick={handleNext}
            type="button"
          >
            {isLastQuestion ? quizText.submitButton : quizText.nextButton}
          </Button>
        </CardFooter>
      </Card>
      <footer className="quiz-footer">{quizText.footerCredit}</footer>
    </main>
  );
}
