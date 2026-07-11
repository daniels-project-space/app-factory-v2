// ReviewPulse — Actionable Insights Engine
// Scans review text for complaint/praise themes and generates smart insights
// Used by the dashboard to show "your rating dropped" / "top complaints" intelligence

import type { SeedReview } from './seed-data';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InsightType = 'rating_drop' | 'response_needed' | 'top_complaint' | 'top_praise' | 'trend_up' | 'milestone';
export type InsightSeverity = 'critical' | 'warning' | 'info' | 'positive';

export type Insight = {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  metric?: string;
  actionLabel?: string;
};

// ─── Keyword Categories ───────────────────────────────────────────────────────

const COMPLAINT_CATEGORIES: { category: string; keywords: string[] }[] = [
  { category: 'wait times', keywords: ['wait', 'waited', 'slow', 'took forever', 'delayed', 'late', 'behind schedule', 'took long', 'hours late'] },
  { category: 'communication', keywords: ['communication', 'never called', 'no update', 'didn\'t respond', 'hard to reach', 'follow up', 'no answer', 'ignored'] },
  { category: 'pricing', keywords: ['overcharged', 'expensive', 'overpriced', 'cost', 'hidden fees', 'price increase', 'over budget', 'bill was higher'] },
  { category: 'quality', keywords: ['sloppy', 'poor quality', 'defect', 'broken', 'damaged', 'not right', 'redo', 'fix it', 'mistake'] },
  { category: 'cleanliness', keywords: ['mess', 'dirty', 'cleanup', 'left a mess', 'debris', 'dust', 'trash'] },
  { category: 'professionalism', keywords: ['rude', 'unprofessional', 'disrespectful', 'dismissive', 'attitude', 'careless'] },
  { category: 'scheduling', keywords: ['reschedule', 'cancelled', 'no-show', 'didn\'t show', 'wrong date', 'missed appointment'] },
];

const PRAISE_CATEGORIES: { category: string; keywords: string[] }[] = [
  { category: 'quality of work', keywords: ['excellent work', 'great job', 'beautiful', 'perfect', 'flawless', 'attention to detail', 'top-notch', 'high quality', 'craftsmanship'] },
  { category: 'customer service', keywords: ['friendly', 'helpful', 'patient', 'responsive', 'went above', 'above and beyond', 'accommodating', 'courteous'] },
  { category: 'timeliness', keywords: ['on time', 'early', 'ahead of schedule', 'efficient', 'quick', 'fast', 'prompt'] },
  { category: 'communication', keywords: ['great communication', 'kept us updated', 'transparent', 'clear', 'explained everything'] },
  { category: 'value', keywords: ['fair price', 'reasonable', 'worth every penny', 'good value', 'as quoted', 'no surprises'] },
  { category: 'cleanliness', keywords: ['clean', 'tidy', 'cleaned up', 'spotless', 'neat'] },
];

// ─── Keyword Extraction ───────────────────────────────────────────────────────

type ThemeCount = {
  category: string;
  count: number;
  type: 'complaint' | 'praise';
};

function extractThemes(reviews: SeedReview[]): ThemeCount[] {
  const counts: Map<string, { count: number; type: 'complaint' | 'praise' }> = new Map();

  for (const review of reviews) {
    if (!review.review_text) continue;
    const lower = review.review_text.toLowerCase();

    // Only scan negative reviews for complaints
    if (review.rating !== null && review.rating <= 3) {
      for (const cat of COMPLAINT_CATEGORIES) {
        if (cat.keywords.some((k) => lower.includes(k))) {
          const existing = counts.get(`complaint:${cat.category}`);
          counts.set(`complaint:${cat.category}`, {
            count: (existing?.count ?? 0) + 1,
            type: 'complaint',
          });
        }
      }
    }

    // Only scan positive reviews for praise
    if (review.rating !== null && review.rating >= 4) {
      for (const cat of PRAISE_CATEGORIES) {
        if (cat.keywords.some((k) => lower.includes(k))) {
          const existing = counts.get(`praise:${cat.category}`);
          counts.set(`praise:${cat.category}`, {
            count: (existing?.count ?? 0) + 1,
            type: 'praise',
          });
        }
      }
    }
  }

  return Array.from(counts.entries())
    .map(([key, val]) => ({
      category: key.split(':')[1],
      count: val.count,
      type: val.type,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Insight Generation ───────────────────────────────────────────────────────

export function generateInsights(reviews: SeedReview[]): Insight[] {
  const insights: Insight[] = [];
  const now = Date.now();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const twoWeeks = 14 * 24 * 60 * 60 * 1000;
  const oneMonth = 30 * 24 * 60 * 60 * 1000;

  // Split reviews by time period
  const thisWeek = reviews.filter((r) => r.review_date && (now - new Date(r.review_date).getTime()) < oneWeek);
  const lastWeek = reviews.filter((r) => {
    if (!r.review_date) return false;
    const diff = now - new Date(r.review_date).getTime();
    return diff >= oneWeek && diff < twoWeeks;
  });
  const thisMonth = reviews.filter((r) => r.review_date && (now - new Date(r.review_date).getTime()) < oneMonth);

  // 1. Rating change detection
  if (thisWeek.length >= 2 && lastWeek.length >= 2) {
    const thisWeekAvg = thisWeek.reduce((s, r) => s + (r.rating ?? 0), 0) / thisWeek.length;
    const lastWeekAvg = lastWeek.reduce((s, r) => s + (r.rating ?? 0), 0) / lastWeek.length;
    const diff = thisWeekAvg - lastWeekAvg;

    if (diff <= -0.3) {
      const negThisWeek = thisWeek.filter((r) => (r.rating ?? 5) <= 2);
      const complaint = negThisWeek.length > 0
        ? extractTopComplaint(negThisWeek)
        : null;

      insights.push({
        id: 'rating-drop',
        type: 'rating_drop',
        severity: 'critical',
        title: `Rating dropped ${Math.abs(diff).toFixed(1)} stars this week`,
        description: complaint
          ? `${negThisWeek.length} negative review${negThisWeek.length > 1 ? 's' : ''} about ${complaint}`
          : `${negThisWeek.length} negative review${negThisWeek.length > 1 ? 's' : ''} received this week`,
        metric: diff.toFixed(1),
      });
    } else if (diff >= 0.2) {
      insights.push({
        id: 'rating-up',
        type: 'trend_up',
        severity: 'positive',
        title: `Rating improved ${diff.toFixed(1)} stars this week`,
        description: `${thisWeek.filter((r) => (r.rating ?? 0) >= 4).length} positive reviews this week -- great momentum!`,
        metric: `+${diff.toFixed(1)}`,
      });
    }
  }

  // 2. Response needed
  const pendingReviews = reviews.filter((r) => !r.owner_reply);
  if (pendingReviews.length > 0) {
    const urgentPending = pendingReviews.filter((r) => {
      if (!r.review_date) return false;
      return (now - new Date(r.review_date).getTime()) < 2 * 24 * 60 * 60 * 1000; // within 48h
    });

    insights.push({
      id: 'response-needed',
      type: 'response_needed',
      severity: urgentPending.length > 0 ? 'warning' : 'info',
      title: `${pendingReviews.length} review${pendingReviews.length > 1 ? 's' : ''} waiting for a response`,
      description: urgentPending.length > 0
        ? `${urgentPending.length} from the last 48 hours -- responding within 24h improves retention by 33%`
        : 'Responding to reviews shows customers you care and boosts your reputation',
      actionLabel: 'View Pending',
    });
  }

  // 3. Top complaint this month
  const themes = extractThemes(thisMonth);
  const topComplaint = themes.find((t) => t.type === 'complaint');
  if (topComplaint && topComplaint.count >= 2) {
    insights.push({
      id: 'top-complaint',
      type: 'top_complaint',
      severity: 'warning',
      title: `Top complaint this month: ${topComplaint.category}`,
      description: `Mentioned in ${topComplaint.count} review${topComplaint.count > 1 ? 's' : ''}. Addressing this could improve your rating significantly.`,
    });
  }

  // 4. Top praise this month
  const topPraise = themes.find((t) => t.type === 'praise');
  if (topPraise && topPraise.count >= 2) {
    insights.push({
      id: 'top-praise',
      type: 'top_praise',
      severity: 'positive',
      title: `Customers love your ${topPraise.category}`,
      description: `Mentioned positively in ${topPraise.count} review${topPraise.count > 1 ? 's' : ''} this month. Keep it up!`,
    });
  }

  // 5. Milestone detection
  if (reviews.length >= 25 && reviews.length < 30) {
    insights.push({
      id: 'milestone-25',
      type: 'milestone',
      severity: 'positive',
      title: 'Milestone: 25+ reviews!',
      description: 'Businesses with 25+ reviews are 3x more likely to appear in local search results. Great progress!',
    });
  }

  // 6. Response rate insight
  const responseRate = reviews.length > 0
    ? (reviews.filter((r) => r.owner_reply).length / reviews.length) * 100
    : 0;

  if (responseRate < 50 && reviews.length >= 5) {
    insights.push({
      id: 'low-response-rate',
      type: 'response_needed',
      severity: 'warning',
      title: `Response rate is ${Math.round(responseRate)}%`,
      description: 'Businesses that respond to at least 80% of reviews see 35% more customer engagement. Try to reply to all reviews, even positive ones.',
      actionLabel: 'Reply to Reviews',
    });
  }

  return insights;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractTopComplaint(negativeReviews: SeedReview[]): string | null {
  const themes = extractThemes(negativeReviews);
  const topComplaint = themes.find((t) => t.type === 'complaint');
  return topComplaint ? topComplaint.category : null;
}

export function getInsightIcon(type: InsightType): string {
  switch (type) {
    case 'rating_drop': return 'trending-down';
    case 'response_needed': return 'message-square';
    case 'top_complaint': return 'alert-triangle';
    case 'top_praise': return 'thumbs-up';
    case 'trend_up': return 'trending-up';
    case 'milestone': return 'award';
  }
}

export function getSeverityColor(severity: InsightSeverity): { bg: string; text: string; border: string } {
  switch (severity) {
    case 'critical':
      return { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' };
    case 'warning':
      return { bg: '#FEF3C7', text: '#B45309', border: '#FCD34D' };
    case 'info':
      return { bg: '#E6F7F7', text: '#0D5C5C', border: '#B3E5E5' };
    case 'positive':
      return { bg: '#D1FAE5', text: '#047857', border: '#34D399' };
  }
}
