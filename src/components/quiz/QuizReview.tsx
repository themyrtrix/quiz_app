"use client";

// Renders the shared results and history answer review.

import { useMemo, useState } from "react";
import type { QuizResultQuestion } from "@/actions/quiz";
import { quizText } from "@/config";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuizReviewProps = {
  questions: QuizResultQuestion[];
};

export function QuizReview({ questions }: QuizReviewProps) {
  const [filter, setFilter] = useState<"all" | "wrong">("all");
  const visibleQuestions = useMemo(
    () => (filter === "wrong" ? questions.filter((question) => !question.isCorrect) : questions),
    [filter, questions],
  );

  return (
    <>
      <div className="flex flex-wrap justify-center gap-3" aria-label="Results filter">
        <Button
          className={cn("quiz-toggle", filter === "all" && "quiz-toggle-active")}
          type="button"
          variant="outline"
          onClick={() => setFilter("all")}
        >
          {quizText.allQuestionsToggle}
        </Button>
        <Button
          className={cn("quiz-toggle", filter === "wrong" && "quiz-toggle-active")}
          type="button"
          variant="outline"
          onClick={() => setFilter("wrong")}
        >
          {quizText.wrongOnlyToggle}
        </Button>
      </div>

      <div className="space-y-4">
        {visibleQuestions.length === 0 ? (
          <p className="rounded-(--quiz-radius) border border-(--quiz-border) bg-(--quiz-card-bg) p-4 text-center font-medium text-(--quiz-muted-text)">
            {quizText.noWrongAnswers}
          </p>
        ) : (
          visibleQuestions.map((question, index) => (
            <article className="quiz-result-row" key={question.questionId}>
              <h3>{index + 1}. {question.questionText}</h3>
              <p className="quiz-answer-correct">
                <span className="quiz-result-icon">✓</span>
                <span>{quizText.correctAnswerLabel}:</span> {question.correctAnswerText}
              </p>
              {!question.isCorrect ? (
                <p className="quiz-answer-wrong">
                  <span className="quiz-result-icon">✕</span>
                  <span>{quizText.yourAnswerLabel}:</span> {question.userAnswerText}
                </p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </>
  );
}
