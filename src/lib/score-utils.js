export function getScoreColor(score) {
  if (score >= 80) return '#27AE60';
  if (score >= 50) return '#F39C12';
  return '#C0392B';
}
