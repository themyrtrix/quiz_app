"use client";

// Renders the start, question, and results screens for QuizMart.

import { useState, useTransition } from "react";
import Link from "next/link";
import { checkAnswer, submitQuiz, type QuizResult } from "@/actions/quiz";
import { quizText } from "@/config";
import { QuizReview } from "@/components/quiz/QuizReview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function shuffleQuizQuestions(questions: QuizQuestion[]) {
  return shuffle(questions).map((question) => ({
    ...question,
    choices: shuffle(question.choices),
  }));
}

function formatScore(score: number, totalQuestions: number) {
  return `${score} / ${totalQuestions} points`;
}

function QuizTitle() {
  return <h1 className="quiz-wordmark" aria-label={quizText.title}>Quiz<span>mart</span></h1>;
}

export function QuizClient({ questions }: QuizClientProps) {
  const [quizQuestions, setQuizQuestions] = useState(() => shuffleQuizQuestions(questions));
  const [screen, setScreen] = useState<Screen>("start");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draftAnswers, setDraftAnswers] = useState<Record<string, string>>({});
  const [lockedAnswers, setLockedAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [answerFeedback, setAnswerFeedback] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentQuestion = quizQuestions[currentIndex];
  const currentLockedChoiceId = currentQuestion ? lockedAnswers[currentQuestion.id] : undefined;
  const currentDraftChoiceId = currentQuestion ? draftAnswers[currentQuestion.id] : undefined;
  const currentChoiceId = currentLockedChoiceId ?? currentDraftChoiceId ?? "";
  const lockedCount = Object.keys(lockedAnswers).length;
  // EDIT: progress math lives here if you want a different progress behavior later.
  const totalQuestions = quizQuestions.length;
  const progressValue = (lockedCount / totalQuestions) * 100;
  const isLastQuestion = currentIndex === quizQuestions.length - 1;
  const canContinue = Boolean(currentChoiceId) && !isPending;

  function resetQuiz() {
    setQuizQuestions(shuffleQuizQuestions(questions));
    setScreen("start");
    setCurrentIndex(0);
    setDraftAnswers({});
    setLockedAnswers({});
    setResult(null);
    setErrorMessage("");
    setAnswerFeedback(null);
  }

  function exitQuiz() {
    resetQuiz();
  }

  function handleStart() {
    setQuizQuestions(shuffleQuizQuestions(questions));
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
    return quizQuestions.map((question) => ({
      questionId: question.id,
      choiceId: nextLockedAnswers[question.id],
    }));
  }

  function handleNext() {
    if (!currentQuestion || !canContinue) {
      return;
    }

    if (answerFeedback !== null) {
      setAnswerFeedback(null);
      if (isLastQuestion) {
        startTransition(async () => {
          try {
            const nextResult = await submitQuiz(buildSubmission(lockedAnswers));
            setResult(nextResult);
            setScreen("results");
          } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
          }
        });
        return;
      }
      setCurrentIndex((index) => index + 1);
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
    startTransition(async () => {
      try {
        const checked = await checkAnswer({
          questionId: currentQuestion.id,
          choiceId: nextLockedAnswers[currentQuestion.id],
        });
        setAnswerFeedback(checked.isCorrect);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Something went wrong.");
      }
    });
  }

  function handleBack() {
    if (currentIndex === 0 || isPending) {
      return;
    }

    setCurrentIndex((index) => index - 1);
    setErrorMessage("");
    setAnswerFeedback(null);
  }

  if (quizQuestions.length === 0) {
    return (
      <main className="quiz-shell">
        <Card className="quiz-card max-w-xl">
          <CardContent className="space-y-4 text-center">
            <QuizTitle />
            <p className="text-lg font-semibold">No questions found. Run the migration and seed scripts.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (screen === "start") {
    return (
      <main className="quiz-shell">
        <section className="quiz-landing">
          <p className="quiz-eyebrow">A quick knowledge challenge</p>
          <QuizTitle />
          <p className="quiz-tagline">
            {quizText.tagline}
          </p>
          <div className="quiz-start-actions">
            <Button className="quiz-button quiz-button-blue text-base" onClick={handleStart}>
              {quizText.startButton}
            </Button>
            <Button className="quiz-button quiz-button-white" asChild>
              <Link href="/history">{quizText.historyButton}</Link>
            </Button>
          </div>
        </section>
      </main>
    );
  }

  if (screen === "results" && result) {
    return (
      <main className="quiz-shell">
        <Card className="quiz-card w-full max-w-4xl">
          <CardContent className="space-y-7">
            <div className="space-y-3">
              <QuizTitle />
              <h2 className="text-3xl font-semibold text-(--quiz-page-text)">
                {quizText.resultsHeading}
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="quiz-stat">
                <span>{quizText.totalScoreLabel}</span>
                <strong>{formatScore(result.score, result.questions.length)}</strong>
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

            <QuizReview questions={result.questions} />

            <div className="flex flex-wrap justify-center gap-3">
              <Button className="quiz-button quiz-button-blue text-base" onClick={resetQuiz}>
                {quizText.playAgainButton}
              </Button>
              <Button className="quiz-button quiz-button-white" asChild>
                <Link href="/history">{quizText.viewHistoryButton}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="quiz-shell">
      <Card className="quiz-card w-full max-w-3xl">
        <CardContent className="space-y-6">
        <div className="quiz-progress-header">
          <div>
            <p className="quiz-eyebrow">{quizText.questionLabel}</p>
            <p className="quiz-progress-count">
              {currentIndex + 1} <span>of {totalQuestions}</span>
            </p>
          </div>
          <Badge variant="secondary" className="quiz-progress-status">
            {lockedCount} {quizText.answeredLabel}
          </Badge>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="quiz-button quiz-button-white quiz-exit-button" type="button">
                <span aria-hidden="true">✕</span> {quizText.exitButton}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{quizText.leaveQuizTitle}</AlertDialogTitle>
                <AlertDialogDescription>{quizText.leaveQuizMessage}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Button className="quiz-button quiz-button-white" type="button">{quizText.keepGoingButton}</Button>
                </AlertDialogCancel>
                <AlertDialogAction>
                  <Button className="quiz-button quiz-button-blue" type="button" onClick={exitQuiz}>{quizText.exitQuizButton}</Button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Separator className="quiz-progress-divider" />
        <div className="quiz-progress-wrap">
          <Progress
            aria-label={`Quiz progress: ${lockedCount} of ${totalQuestions} answered`}
            className="quiz-progress"
            value={progressValue}
          />
        </div>

          <div className="quiz-question-box">
            <h2>{currentQuestion.text}</h2>
          </div>
          <p className="quiz-question-hint">
            {quizText.questionHint}
          </p>
          <RadioGroup
            className="gap-3"
            disabled={Boolean(currentLockedChoiceId) || isPending}
            onValueChange={handleChoiceChange}
            value={currentChoiceId}
          >
            {currentQuestion.choices.map((choice) => (
              <label
                className={`quiz-choice ${
                  answerFeedback !== null && choice.id === currentChoiceId
                    ? answerFeedback
                      ? "quiz-choice-correct"
                      : "quiz-choice-incorrect"
                    : ""
                }`}
                key={choice.id}
              >
                <RadioGroupItem className="quiz-radio" value={choice.id} />
                <span className="quiz-choice-text">{choice.text}</span>
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
            {answerFeedback !== null
              ? (isLastQuestion ? quizText.submitButton : quizText.continueButton)
              : quizText.nextButton}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
