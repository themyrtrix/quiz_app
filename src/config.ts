// Stores the QuizMart settings and visible text that are easiest to edit later.

export const quizSettings = {
  // EDIT: change the number of questions shown in each quiz here.
  questionCount: 10,
  // EDIT: change the points awarded for each correct answer here.
  pointsForCorrectAnswer: 1,
  // EDIT: change the points removed for each wrong answer here.
  pointsForWrongAnswer: -1,
} as const;

export const quizText = {
  // EDIT: change the app title and tagline here.
  title: "QuizMart",
  tagline: "Can your brain handle it?",
  startButton: "Start",
  backButton: "Back",
  nextButton: "Next",
  submitButton: "Submit",
  playAgainButton: "Play again",
  allQuestionsToggle: "All questions",
  wrongOnlyToggle: "Wrong only",
  questionLabel: "Question",
  resultsHeading: "Results",
  totalScoreLabel: "Total score",
  correctCountLabel: "Correct answers",
  wrongCountLabel: "Wrong answers",
  correctAnswerLabel: "Correct answer",
  yourAnswerLabel: "Your answer",
  noWrongAnswers: "No wrong answers to review.",
  footerCredit: "Questions from Open Trivia DB",
} as const;
