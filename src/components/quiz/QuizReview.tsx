"use client";

// Renders the shared results and history answer review.

import { useMemo, useState } from "react";
import type { QuizResultQuestion } from "@/actions/quiz";
import { quizText } from "@/config";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
      <ToggleGroup
        aria-label="Results filter"
        type="single"
        value={filter}
        onValueChange={(value) => {
          if (value) setFilter(value as "all" | "wrong");
        }}
      >
        <ToggleGroupItem value="all">
          {quizText.allQuestionsToggle}
        </ToggleGroupItem>
        <ToggleGroupItem value="wrong">
          {quizText.wrongOnlyToggle}
        </ToggleGroupItem>
      </ToggleGroup>

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
                <Badge className="mr-1" variant="success">{quizText.correctAnswerLabel}</Badge>
                {question.correctAnswerText}
              </p>
              {!question.isCorrect ? (
                <p className="quiz-answer-wrong">
                  <span className="quiz-result-icon">✕</span>
                  <Badge className="mr-1" variant="destructive">{quizText.yourAnswerLabel}</Badge>
                  {question.userAnswerText}
                </p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </>
  );
}
