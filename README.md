# Quizmart

Quizmart is a simple school-style quiz app. A teacher provides a question file, students
answer the questions, and the app shows the score and answer review at the end.

## Quick start

### 1. Start the app

```bash
npm install
npm run dev
```

Open the local address shown in the terminal, usually:

```text
http://localhost:3000
```

### 2. Change the questions

Replace this file:

```text
prisma/questions.json
```

Then refresh the Quizmart homepage. The app automatically reads the file and updates the
active question bank. You do not normally need to run a seed command.

The app accepts any number of questions. Each question must have between 2 and 6 answer
choices.

Example:

```json
[
  {
    "question": "What is 2 + 2?",
    "choices": ["3", "4", "5", "6"],
    "correctIndex": 1
  }
]
```

Common alternatives are also accepted:

- Question text: `question`, `text`, `prompt`, or `title`
- Choices: `choices`, `options`, `answers`, or `alternatives`
- Correct answer: `correctIndex`, `correctAnswer`, `correct`, or `answer`
- Questions may be inside `questions`, `items`, `results`, or `data`

If the teacher gives a file with a different structure, try replacing the contents of
`prisma/questions.json` and refresh the homepage. If it does not load, keep the error
message and adjust the importer in `src/lib/question-file.ts`.

### 3. Test from a clean history

The History page is at:

```text
http://localhost:3000/history
```

Normal quiz attempts are saved there. To clear test history while keeping the questions,
run this only when you intentionally want a clean test database:

```bash
node -r dotenv/config - <<'NODE'
const { Client } = require("pg");
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("BEGIN");
  await client.query('DELETE FROM "AttemptAnswer"');
  await client.query('DELETE FROM "Attempt"');
  await client.query("COMMIT");
  await client.end();
  console.log("Quiz history cleared.");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
```

## What students experience

1. The Start screen has Start and History buttons.
2. Questions and choices are shuffled for each new quiz.
3. Selecting an answer and pressing Next locks that answer.
4. The selected answer row turns green or red after it is checked.
5. The student presses Continue to move on.
6. Submit saves the attempt and shows the final score.
7. History contains the saved attempt and its answer review.
8. Exit asks for confirmation and does not save the unfinished quiz.

## Scoring

- Correct answer: 1 point
- Wrong answer: 0 points
- Score: number of correct answers
- Score can never be negative

The score is shown against the actual number of uploaded questions, for example:

```text
8 / 12 points
```

## Main pages

- `/` — start screen, quiz, and results
- `/history` — latest saved attempts
- `/history/[id]` — review of one saved attempt

## Simple project map

```text
prisma/questions.json       Questions supplied by the teacher
src/config.ts               App text and scoring settings
src/app/page.tsx            Homepage and active question loading
src/app/history/            History pages
src/actions/quiz.ts         Server-side answer checking and saving
src/lib/question-file.ts    Flexible question-file reader
src/lib/question-bank.ts    Automatic question-bank update
src/components/quiz/        Quiz, results, and review screens
src/components/ui/          Reusable shadcn UI components
src/app/globals.css         Colors, typography, and visual design
prisma/schema.prisma        Database structure
```

## Where to edit things

- Change visible wording: `src/config.ts`
- Change questions: replace `prisma/questions.json`
- Change scoring: `pointsForCorrectAnswer` and `pointsForWrongAnswer` in `src/config.ts`
- Change colors and fonts: the variables at the top of `src/app/globals.css`
- Change quiz behavior: `src/components/quiz/QuizClient.tsx`
- Change answer checking or saving: `src/actions/quiz.ts`
- Change flexible file support: `src/lib/question-file.ts`
- Change automatic question syncing: `src/lib/question-bank.ts`

## Database and safety

Quizmart uses Prisma Postgres. The local `.env` file contains the private `DATABASE_URL`;
never commit it or share it.

When `questions.json` changes, old questions are archived and new questions become active.
Existing History attempts are preserved. The app does not use a question API; questions come
from the local file only.

The correct answer is checked on the server. It is not sent to the browser while the student
is taking the quiz.

## Design

Quizmart uses a light, formal, educational design:

- White cards on a very light gray background
- Dark readable text
- Blue only for primary actions, selected answers, and progress
- Green for correct answers
- Red for wrong answers
- Inter typography
- Reusable shadcn/Radix UI components

## Current project status

The project is working and pushed to GitHub. The current implementation includes:

- Flexible local question-file importing
- Any number of questions
- 2-6 choices per question
- Automatic question-bank updates
- Shuffled questions and choices
- Server-side answer checking
- Inline green/red answer feedback
- Configurable positive-only scoring
- Saved results and History pages
- Exit confirmation without saving unfinished quizzes
- Light formal UI using shadcn-style components

The latest checks pass:

- ESLint
- TypeScript
- Production build

## Copyable context for another AI

```text
This is Quizmart, a Next.js 16 App Router quiz app using React, TypeScript, Tailwind,
shadcn/Radix UI, Prisma 7, and Prisma Postgres.

The user changes questions by replacing prisma/questions.json. The homepage automatically
reads the file and updates the active question bank. Existing quiz History must be preserved.
The importer supports JSON arrays or nested questions/items/results/data arrays, common field
names such as question/text/prompt/title, choices/options/answers/alternatives, and correct
answers using correctIndex or answer text. It accepts any number of questions and 2-6 choices
per question.

Quiz rules:
- Questions and choices shuffle for every new quiz.
- Selecting an answer does not lock it until Next is pressed.
- After Next, the selected row turns green or red based on the server-checked answer.
- The answer is locked and the user presses Continue to proceed.
- Submit saves the attempt.
- Correct answers are worth 1 point; wrong answers are worth 0; score equals correct count.
- Exit resets the quiz without saving it.
- History is available at /history and /history/[id].

Important files:
- src/components/quiz/QuizClient.tsx: quiz state, navigation, feedback, and results
- src/actions/quiz.ts: server answer checking, scoring, and attempt saving
- src/lib/question-file.ts: flexible question-file parsing and validation
- src/lib/question-bank.ts: automatic file-to-database synchronization
- src/config.ts: visible text and scoring values
- src/app/globals.css: light theme and visual styles
- prisma/schema.prisma: database models
- prisma/questions.json: teacher question file

Do not expose correct answers to the browser during an active quiz. Preserve existing
attempts when syncing a new question file. Run npm run lint, npm run typecheck, and npm run
build after code changes.
```
