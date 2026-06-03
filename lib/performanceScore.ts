export type PerformanceMetrics = {
  reach?: number | null;
  impressions?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  clicks?: number | null;
};

function metric(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getMetricReach(metrics: PerformanceMetrics) {
  return Math.max(metric(metrics.reach), metric(metrics.impressions));
}

export function getMetricEngagement(metrics: PerformanceMetrics) {
  return (
    metric(metrics.likes) +
    metric(metrics.comments) +
    metric(metrics.shares) +
    metric(metrics.saves) +
    metric(metrics.clicks)
  );
}

export function calculatePerformanceScore(metrics: PerformanceMetrics) {
  const reach = getMetricReach(metrics);
  const engagement = getMetricEngagement(metrics);

  if (reach <= 0) {
    return engagement > 0 ? Math.min(35, 8 + engagement * 2) : 0;
  }

  const engagementRate = engagement / reach;
  const reachScore = Math.min(45, Math.log10(reach + 1) * 15);
  const engagementScore = Math.min(35, Math.log10(engagement + 1) * 20);
  const rateScore = Math.min(20, engagementRate * 120);
  const smallSamplePenalty = reach < 100 ? 0.55 + reach / 220 : 1;

  return Math.max(
    1,
    Math.min(100, Math.round((reachScore + engagementScore + rateScore) * smallSamplePenalty))
  );
}
