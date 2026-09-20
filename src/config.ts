// Stores the QuizMart settings and visible text that are easiest to edit later.

export const quizSettings = {
  // EDIT: change the points awarded for each correct answer here.
  pointsForCorrectAnswer: 1,
  // EDIT: change the points awarded for each wrong answer here; keep this at 0 for no deduction.
  pointsForWrongAnswer: 0,
} as const;

export const quizText = {
  // EDIT: change the app title and tagline here.
  title: "Quizmart",
  tagline: "Can your brain handle it?",
  startButton: "Start",
  nextButton: "Next",
  submitButton: "Submit",
  exitButton: "Exit",
  questionHint: "One try per question. Your answer locks when you press Next.",
  answeredLabel: "answered",
  playAgainButton: "Play again",
  allQuestionsToggle: "All questions",
  wrongOnlyToggle: "Wrong only",
  historyButton: "History",
  viewHistoryButton: "View history",
  backButton: "Back",
  takeQuizButton: "Take the quiz",
  noAttemptsMessage: "No attempts yet. Take your first quiz!",
  leaveQuizTitle: "Leave the quiz?",
  leaveQuizMessage: "Your progress will be lost.",
  keepGoingButton: "Keep going",
  exitQuizButton: "Exit quiz",
  historyHeading: "Attempt history",
  historyDateLabel: "Date and time",
  historyScoreLabel: "Score",
  historyCorrectLabel: "Correct",
  historyMistakesLabel: "Mistakes",
  questionLabel: "Question",
  resultsHeading: "Results",
  totalScoreLabel: "Score",
  correctCountLabel: "Correct answers",
  wrongCountLabel: "Mistakes",
  correctAnswerLabel: "Correct answer",
  yourAnswerLabel: "Your answer",
  noWrongAnswers: "No wrong answers to review.",
} as const;
