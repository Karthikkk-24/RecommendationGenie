/** True while async AI explanation jobs have not yet replaced the template copy. */
export function hasPendingAiExplanations(
  items: Array<{ explanation?: string | null; reason?: string | null }>,
): boolean {
  return items.some(
    (item) =>
      Boolean(item.explanation) &&
      Boolean(item.reason) &&
      item.explanation === item.reason,
  );
}

/** Poll interval while explanations are still the template; otherwise stop. */
export function explanationRefetchInterval(
  items: Array<{ explanation?: string | null; reason?: string | null }> | undefined,
  ms = 2000,
): number | false {
  if (!items?.length || !hasPendingAiExplanations(items)) {
    return false;
  }
  return ms;
}
