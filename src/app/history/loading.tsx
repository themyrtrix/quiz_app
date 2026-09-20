export default function HistoryLoading() {
  return (
    <main aria-busy="true" aria-label="Loading history" className="quiz-shell quiz-history-loading">
      <div className="quiz-loading-indicator" role="status">
        Loading history...
      </div>
    </main>
  );
}
