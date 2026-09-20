# QuizMart

## Overview

QuizMart is a simple anonymous multiple-choice quiz app. It loads 10 questions, locks each answer when the player presses Next or Submit, checks answers on the server, saves the attempt, and shows results only at the end.

## Tech stack

- Next.js 16.3.5 App Router
- React 19.2.8
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui 4.21.0 components: Button, Card, Progress, RadioGroup
- Prisma ORM 7.10.0 with Prisma Postgres from the Vercel Marketplace
- Node.js 24.13.1 locally
- npm

Prisma 8 is currently shown by Prisma as the newest line, but this project uses Prisma ORM 7.10.0 because it keeps the traditional `schema.prisma`, Prisma Client, migration, and seed workflow used by this app.

## Project structure

```text
quiz_app/
├── prisma/
│   ├── schema.prisma        # Database models: Question, Choice, Attempt, AttemptAnswer.
│   ├── questions.json       # EDIT: local teacher-provided questions used by default.
│   ├── seed.ts              # Validates local questions, optionally fetches Open Trivia DB, and seeds DB.
│   └── check-db.ts          # Checks DATABASE_URL connectivity.
├── src/
│   ├── actions/quiz.ts      # Server-side answer checking, scoring, and attempt saving.
│   ├── app/globals.css      # EDIT: all colors, fonts, theme variables, and shared styles.
│   ├── app/layout.tsx       # App metadata and Inter font setup.
│   ├── app/page.tsx         # Loads questions without correct answers and renders QuizMart.
│   ├── app/history/page.tsx # Server-rendered list of the latest 50 attempts.
│   ├── app/history/[id]/page.tsx # Server-rendered review for one attempt.
│   ├── components/quiz/
│   │   ├── QuizClient.tsx   # Start, quiz, locking, progress, exit, and results UI.
│   │   └── QuizReview.tsx   # Shared results/history answer review.
│   ├── components/ui/       # shadcn/ui Button, Card, Progress, RadioGroup, AlertDialog.
│   ├── config.ts            # EDIT: question count, scoring, and all visible text.
│   ├── generated/prisma/    # Generated Prisma Client output.
│   └── lib/prisma.ts        # Lazy Prisma Client helper.
├── .env.example             # Placeholder DATABASE_URL only.
├── prisma7.config.ts        # Prisma CLI config, migrations path, seed command, datasource env.
├── package.json             # npm scripts and dependencies.
└── README.md                # This guide.
```

## How the app works

Screen flow:

1. `src/app/page.tsx` loads questions and choices from the database without selecting `Choice.isCorrect`, then shuffles both for each quiz page load.
2. `src/components/quiz/QuizClient.tsx` shows Start, then each question, then Results.
3. `src/actions/quiz.ts` checks submitted answers on the server and returns correct answers only for the results screen.
4. `/history` lists the latest 50 saved attempts, and `/history/[id]` shows a saved review.

Quiz rules and where they live:

- One attempt per question: `QuizClient.tsx` copies a draft answer into `lockedAnswers` only when Next or Submit is pressed.
- No feedback during quiz: `page.tsx` never sends `isCorrect`, and `QuizClient.tsx` does not render correctness before results.
- Back is review-only: `QuizClient.tsx` disables the RadioGroup for locked answers.
- Progress advances only on Next/Submit: `QuizClient.tsx` calculates progress from locked answers.
- Questions and choices are shuffled for every new quiz page load; correct answers remain server-only.
- Scoring is one point per correct answer and zero points per wrong answer: `src/actions/quiz.ts` uses `src/config.ts` scoring settings. The score equals the correct-answer count and cannot be negative.
- Correct answers are server-only during the quiz: `src/actions/quiz.ts` is the only quiz path that reads `Choice.isCorrect`.
- Exit opens an accessible confirmation dialog and resets the in-progress quiz without saving an attempt.

## Database

- `Question`: stores the question text.
- `Choice`: stores four choices for each question and the private `isCorrect` flag.
- `Attempt`: stores anonymous attempt score, correct count, wrong count, total questions, and date/time.
- `AttemptAnswer`: stores each chosen answer, linked to its attempt, question, and choice.

Reads:

- `src/app/page.tsx` reads questions and choices for the quiz, excluding correct answers.

Writes:

- `prisma/seed.ts` clears old quiz data and inserts a fresh set of questions and choices.
- `src/actions/quiz.ts` creates one `Attempt` and the related `AttemptAnswer` rows after Submit.

## Routes

- `/`: Start, quiz, and results flow.
- `/history`: Latest 50 attempts, newest first.
- `/history/[id]`: Detailed review of one saved attempt.

## Setup and run

Install dependencies:

```bash
npm install
```

Create local env:

```bash
cp .env.example .env
```

Vercel's Prisma Marketplace integration creates exactly this variable on the connected Vercel project:

```text
DATABASE_URL
```

It is a Prisma Postgres URL beginning with `postgres://...`. Paste that real value into local `.env`:

```env
DATABASE_URL="postgres://..."
```

Never commit `.env` or share the real database URL.

Generate Prisma Client:

```bash
npm run prisma:generate
```

Create and apply the initial migration locally against the hosted Prisma Postgres database:

```bash
npm run prisma:migrate -- --name init
```

Seed the local question file:

```bash
npm run prisma:seed
```

The default source is `prisma/questions.json`. The app reads the questions saved in Prisma,
then shuffles their order and choice order whenever a new quiz page loads. To use another
teacher-provided JSON file:

```bash
QUESTION_FILE=prisma/teacher-questions.json npm run prisma:seed
```

The importer accepts JSON arrays or nested `questions`, `items`, `results`, or `data` arrays.
It recognizes common field names:

- Question: `question`, `text`, `prompt`, or `title`
- Choices: `choices`, `options`, `answers`, or `alternatives`
- Correct answer: a zero-based `correctIndex`, or the answer text in
  `correctAnswer`, `correct`, or `answer`

CSV files are also accepted. Use headers such as `question,options,correctAnswer`; put
multiple choices in the options cell separated by `|`. The imported set must still contain
exactly `questionCount` questions, and each question must have exactly four choices.

For example, this JSON works:

```json
[
  {
    "prompt": "What is 2 + 2?",
    "options": ["3", "4", "5", "6"],
    "correctAnswer": "4"
  }
]
```

Seeding replaces the current question set and deletes existing attempts, so back up any
attempt data you need before running it. The app does not call Open Trivia DB during quiz
play. Open Trivia DB is available only when explicitly requested while seeding:

```bash
USE_OPEN_TRIVIA=true npm run prisma:seed
```

To check a teacher file before changing the database, run:

```bash
VALIDATE_ONLY=true QUESTION_FILE=prisma/teacher-questions.json npm run prisma:seed
```

Check the database connection:

```bash
npm run db:check
```

Run locally:

```bash
npm run dev
```

Open `http://localhost:3000`.

Deploy to Vercel:

```bash
git add .
git commit -m "Build QuizMart"
git push
```

In Vercel, import the GitHub repo, open Storage, create a Prisma Postgres database from the Marketplace, and connect it to the project. Redeploy after `DATABASE_URL` is added. For production schema setup, run:

```bash
npm run prisma:deploy
npm run prisma:seed
```

## Where to edit things

- I want to change the visible text, so edit `src/config.ts`.
- I want to change the number of questions, so edit `quizSettings.questionCount` in `src/config.ts`, update `prisma/questions.json`, then run `npm run prisma:seed`.
- I want to change scoring, so edit `pointsForCorrectAnswer` and `pointsForWrongAnswer` in `src/config.ts`; use `1` and `0` for one point per correct answer with no deduction for mistakes.
- I want to change colors or fonts, so edit the CSS variables at the top of `src/app/globals.css`.
- I want to change quiz questions, so replace `prisma/questions.json` or set `QUESTION_FILE` to a teacher-provided JSON file, then run `npm run prisma:seed`.
- I want to change the quiz UI, so start in `src/components/quiz/QuizClient.tsx`.
- I want to change the shared results/history review, so edit `src/components/quiz/QuizReview.tsx`.
- I want to change history pages, so edit `src/app/history/page.tsx` or `src/app/history/[id]/page.tsx`.
- Search for `EDIT:` comments for likely edit points.

## Design

QuizMart uses a light-only, formal educational interface. The page uses a white card on a
very light gray background, slate text, thin borders, moderate 12px corners, and subtle
shadows. Blue is reserved for primary actions, selected answers, and progress. Correct and
wrong review states use accessible green and red text/background pairs. Inter is used for
all headings, body copy, and controls. Update the matched color variables and their `EDIT:`
comments at the top of `src/app/globals.css`; keep text/background pairs readable when
changing the palette.

## Notes for AI assistants

Key files: `src/config.ts`, `src/app/page.tsx`, `src/app/history/page.tsx`, `src/app/history/[id]/page.tsx`, `src/components/quiz/QuizClient.tsx`, `src/components/quiz/QuizReview.tsx`, `src/actions/quiz.ts`, `src/app/globals.css`, `prisma/schema.prisma`, `prisma/seed.ts`.

Do not break these rules: correct answers must not be sent to the browser during the quiz, answers must be checked on the server in `src/actions/quiz.ts`, answers lock only on Next/Submit, Back is review-only, Exit does not save an attempt, history is read on the server, and scoring is the number of correct answers with no negative totals.
