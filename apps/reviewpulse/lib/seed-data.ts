// ReviewPulse — Demo Seed Data
// Populates realistic sample data on first launch so the app feels alive
// Called from _layout.tsx after auth initialization

import AsyncStorage from '@react-native-async-storage/async-storage';

const SEED_KEY = 'reviewpulse_demo_seeded';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeedReview = {
  id: string;
  platform: 'google' | 'yelp';
  reviewer_name: string;
  reviewer_avatar_url: null;
  rating: number;
  review_text: string;
  review_url: string | null;
  owner_reply: string | null;
  ai_draft: string | null;
  is_new: boolean;
  is_flagged: boolean;
  review_date: string;
  created_at: string;
};

export type SeedCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  opt_out: boolean;
  request_count: number;
  last_request_at: string | null;
  created_at: string;
  notes: string | null;
  tags: string[];
  total_requests_sent: number;
  opted_out: boolean;
  opted_out_at: string | null;
};

export type SeedRequest = {
  id: string;
  customer_id: string;
  to_name: string;
  delivery_status: 'sent' | 'delivered' | 'failed' | 'pending';
  message_body: string;
  sent_at: string;
  created_at: string;
};

export type SeedBusinessProfile = {
  id: string;
  business_name: string;
  platform: string;
  current_rating: number;
  total_reviews: number;
  last_polled_at: string;
  place_id: string;
  is_active: boolean;
  connected_at: string;
  user_id: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uuid(): string {
  const hex = () => Math.floor(Math.random() * 16).toString(16);
  const seg = (n: number) => Array.from({ length: n }, hex).join('');
  return `${seg(8)}-${seg(4)}-4${seg(3)}-${((Math.random() * 4) | 8).toString(16)}${seg(3)}-${seg(12)}`;
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60));
  return d.toISOString();
}

function randomPhone(): string {
  const area = [212, 310, 415, 512, 617, 713, 813, 503, 602, 704][Math.floor(Math.random() * 10)];
  const mid = Math.floor(Math.random() * 900) + 100;
  const end = Math.floor(Math.random() * 9000) + 1000;
  return `+1${area}${mid}${end}`;
}

// ─── Review Content ───────────────────────────────────────────────────────────

const POSITIVE_REVIEWS = [
  { name: 'Sarah Mitchell', rating: 5, text: 'Absolutely incredible service! The team arrived on time, was extremely professional, and went above and beyond. My kitchen looks brand new. Will definitely be calling again for future projects.' },
  { name: 'James Rodriguez', rating: 5, text: 'Best experience I\'ve had with any service provider in years. Fair pricing, excellent communication throughout, and the quality of work speaks for itself. Highly recommend!' },
  { name: 'Emily Chen', rating: 5, text: 'From the initial estimate to the final walkthrough, everything was top-notch. They even cleaned up after themselves which is rare. Five stars well deserved.' },
  { name: 'Michael Thompson', rating: 4, text: 'Really solid work. Showed up when they said they would, got the job done efficiently, and the price was exactly as quoted. Only reason for 4 stars is scheduling took a bit longer than expected initially.' },
  { name: 'Lisa Park', rating: 5, text: 'I\'ve tried three different companies before and none came close to this level of quality. The attention to detail was remarkable. Already recommended them to two friends.' },
  { name: 'David Williams', rating: 4, text: 'Great job on the bathroom remodel. The team was friendly and knowledgeable. Came in slightly over the original timeline but the end result was worth the wait. Very happy with the outcome.' },
  { name: 'Amanda Foster', rating: 5, text: 'Outstanding work! They transformed our backyard into exactly what we envisioned. The project manager kept us updated every step of the way. Professional crew, beautiful results.' },
  { name: 'Robert Kim', rating: 5, text: 'Outstanding customer service from start to finish. They answered all my questions patiently and delivered exactly what was promised. The quality exceeded my expectations.' },
  { name: 'Jennifer Walsh', rating: 4, text: 'Very pleased with the work done on our home. The team was respectful of our space and the finished product looks great. Would use them again without hesitation.' },
  { name: 'Chris Nguyen', rating: 5, text: 'These folks are the real deal. Honest, hardworking, and they stand behind their work. Had a minor issue after installation and they came back to fix it the next day, no questions asked.' },
  { name: 'Rachel Stevens', rating: 5, text: 'I don\'t usually write reviews but this company earned it. Showed up early, worked efficiently, and left our place cleaner than they found it. The results are stunning.' },
  { name: 'Tom Bradley', rating: 4, text: 'Solid work from a reliable team. Communication was good and they met the deadline. The final result looks professional and clean. Would definitely consider them for future projects.' },
];

const NEUTRAL_REVIEWS = [
  { name: 'Karen White', rating: 3, text: 'The work itself was decent but communication could have been better. Had to follow up multiple times to get updates on the project timeline. End result was acceptable though.' },
  { name: 'Brian Cooper', rating: 3, text: 'Average experience overall. The job got done but it took longer than quoted and I had to point out a few things that needed fixing. They did come back to address the issues though.' },
  { name: 'Diana Moore', rating: 3, text: 'Mixed feelings. Quality of materials used was good but the crew seemed rushed. A few areas could have used more attention to detail. Fair price for what we got.' },
  { name: 'Steven Clark', rating: 3, text: 'Okay service. Nothing spectacular but nothing terrible either. The scheduling was a bit of a hassle and there was a miscommunication about the scope of work. Decent outcome.' },
];

const NEGATIVE_REVIEWS = [
  { name: 'Mark Anderson', rating: 2, text: 'Disappointed with the experience. Waited three weeks for them to start the job and then it took twice as long as quoted. The work quality was mediocre at best. Expected better for the price we paid.' },
  { name: 'Patricia Hughes', rating: 1, text: 'Terrible experience. They showed up late repeatedly, left a mess every day, and the finished work had multiple defects. When I pointed out the issues, they were dismissive. Would not recommend.' },
  { name: 'Gary Wilson', rating: 2, text: 'Not impressed. The initial estimate was significantly lower than the final bill with no explanation for the difference. The work was passable but not worth the premium we ended up paying.' },
  { name: 'Sandra Lee', rating: 1, text: 'Very unhappy. They damaged our flooring during installation and tried to blame it on pre-existing conditions. Still waiting for them to come back and fix the issues they caused. Save yourself the headache.' },
  { name: 'Kevin Brown', rating: 2, text: 'Subpar service. The main contractor was fine but the subcontractors they brought in did sloppy work. Had to call them back twice to fix things that should have been done right the first time.' },
];

const OWNER_REPLIES = [
  'Thank you so much for your kind words! It was a pleasure working with you, and we\'re thrilled you\'re happy with the results. We look forward to helping you with future projects!',
  'We really appreciate you taking the time to share your experience! Our team takes great pride in their work, and it means a lot to hear that it shows. Thank you for your trust in us.',
  'Thank you for the wonderful review! We\'re glad everything went smoothly and that you\'re enjoying the finished product. Don\'t hesitate to reach out if you ever need anything else.',
  'We appreciate your feedback! We\'re constantly working to improve our scheduling process to better serve our customers. Thank you for your patience and for choosing us.',
  'We sincerely apologize for the issues you experienced. This is not the standard we hold ourselves to. I\'d like to personally discuss how we can make this right. Please reach out to me directly at our office number.',
];

const AI_DRAFTS = [
  'Thank you for your review! We appreciate your honest feedback and are glad to hear the project met your expectations. If there\'s anything we can do better next time, we\'d love to hear about it.',
  'We appreciate you sharing your experience. Your feedback helps us improve our service. We\'d love the opportunity to exceed your expectations on future projects.',
];

// ─── Generate Seed Data ───────────────────────────────────────────────────────

function generateSeedReviews(): SeedReview[] {
  const reviews: SeedReview[] = [];

  // Distribute across 90 days with realistic clustering
  // More reviews in recent days, gaps on weekends
  const allReviewContent = [
    ...POSITIVE_REVIEWS.map((r) => ({ ...r, sentiment: 'positive' as const })),
    ...NEUTRAL_REVIEWS.map((r) => ({ ...r, sentiment: 'neutral' as const })),
    ...NEGATIVE_REVIEWS.map((r) => ({ ...r, sentiment: 'negative' as const })),
  ];

  // Shuffle
  for (let i = allReviewContent.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allReviewContent[i], allReviewContent[j]] = [allReviewContent[j], allReviewContent[i]];
  }

  // Date distribution: exponential decay (more recent reviews)
  const dateDays = [
    0, 1, 2, 3, 4, 5, 7, 8, 10, 12, 14,
    16, 19, 22, 25, 28, 32, 37, 42, 48,
    55, 60, 65, 70, 75, 80, 85,
  ];

  for (let i = 0; i < allReviewContent.length; i++) {
    const content = allReviewContent[i];
    const dayOffset = dateDays[i % dateDays.length] + (i >= dateDays.length ? 5 : 0);
    const reviewDate = daysAgo(dayOffset);
    const platform = i % 4 === 0 ? 'yelp' : 'google';

    // Some reviews get owner replies (mostly positive ones)
    let ownerReply: string | null = null;
    let aiDraft: string | null = null;
    const isNew = dayOffset <= 2;

    if (content.sentiment === 'positive' && Math.random() > 0.3) {
      ownerReply = OWNER_REPLIES[Math.floor(Math.random() * 3)];
    } else if (content.sentiment === 'negative' && Math.random() > 0.5) {
      ownerReply = OWNER_REPLIES[4]; // Apologetic reply
    } else if (content.sentiment === 'neutral' && Math.random() > 0.6) {
      ownerReply = OWNER_REPLIES[3];
    }

    // Some pending reviews get AI drafts
    if (!ownerReply && Math.random() > 0.6) {
      aiDraft = AI_DRAFTS[Math.floor(Math.random() * AI_DRAFTS.length)];
    }

    reviews.push({
      id: uuid(),
      platform,
      reviewer_name: content.name,
      reviewer_avatar_url: null,
      rating: content.rating,
      review_text: content.text,
      review_url: platform === 'yelp' ? 'https://yelp.com/biz/example' : null,
      owner_reply: ownerReply,
      ai_draft: aiDraft,
      is_new: isNew,
      is_flagged: content.sentiment === 'negative' && Math.random() > 0.7,
      review_date: reviewDate,
      created_at: reviewDate,
    });
  }

  // Sort by date descending
  reviews.sort((a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime());

  return reviews;
}

function generateSeedCustomers(): SeedCustomer[] {
  const customerNames = [
    { name: 'Sarah Mitchell', email: 'sarah.m@email.com' },
    { name: 'James Rodriguez', email: 'j.rodriguez@gmail.com' },
    { name: 'Emily Chen', email: 'emily.chen@outlook.com' },
    { name: 'Michael Thompson', email: 'mthompson@email.com' },
    { name: 'Lisa Park', email: 'lisa.park@gmail.com' },
    { name: 'David Williams', email: 'dwilliams@email.com' },
    { name: 'Amanda Foster', email: 'amanda.f@yahoo.com' },
    { name: 'Robert Kim', email: 'rkim@email.com' },
    { name: 'Jennifer Walsh', email: 'jwalsh@gmail.com' },
    { name: 'Chris Nguyen', email: 'chris.n@outlook.com' },
    { name: 'Rachel Stevens', email: 'rstevens@email.com' },
    { name: 'Tom Bradley', email: 'tom.b@gmail.com' },
    { name: 'Karen White', email: 'k.white@email.com' },
    { name: 'Brian Cooper', email: 'bcooper@yahoo.com' },
    { name: 'Diana Moore', email: null },
  ];

  return customerNames.map((c, i) => {
    const requestCount = Math.max(0, Math.floor(Math.random() * 4));
    const daysBack = Math.floor(Math.random() * 60) + 5;
    const isOptedOut = i === 12; // Karen opted out

    return {
      id: uuid(),
      name: c.name,
      email: c.email,
      phone: randomPhone(),
      opt_out: isOptedOut,
      request_count: requestCount,
      last_request_at: requestCount > 0 ? daysAgo(Math.floor(Math.random() * 30) + 1) : null,
      created_at: daysAgo(daysBack),
      notes: i === 0 ? 'VIP customer - kitchen remodel project' : i === 3 ? 'Referred by Lisa Park' : null,
      tags: i === 0 ? ['vip', 'kitchen'] : i === 5 ? ['bathroom'] : [],
      total_requests_sent: requestCount,
      opted_out: isOptedOut,
      opted_out_at: isOptedOut ? daysAgo(15) : null,
    };
  });
}

function generateSeedRequests(customers: SeedCustomer[]): SeedRequest[] {
  const requests: SeedRequest[] = [];
  const templates = [
    'Hi {name}, thanks for choosing Summit Home Services! We\'d love a quick review: g.page/r/summit-home -- Reply STOP to opt out.',
    'Hi {name}, thank you for trusting Summit Home Services with your project! If you have a moment, a review would mean the world: g.page/r/summit-home -- Reply STOP to opt out.',
    'Hi {name}, we hope everything looks great! If you\'re happy with the work, a review helps us grow: g.page/r/summit-home -- Reply STOP to opt out.',
  ];

  for (const customer of customers) {
    for (let i = 0; i < customer.request_count; i++) {
      const daysBack = Math.floor(Math.random() * 45) + 1;
      const statuses: Array<'sent' | 'delivered' | 'failed'> = ['delivered', 'delivered', 'sent', 'delivered', 'failed'];
      const template = templates[Math.floor(Math.random() * templates.length)];

      requests.push({
        id: uuid(),
        customer_id: customer.id,
        to_name: customer.name,
        delivery_status: statuses[Math.floor(Math.random() * statuses.length)],
        message_body: template.replace('{name}', customer.name.split(' ')[0]),
        sent_at: daysAgo(daysBack),
        created_at: daysAgo(daysBack),
      });
    }
  }

  return requests;
}

function generateSeedBusinessProfile(userId: string): SeedBusinessProfile {
  return {
    id: uuid(),
    business_name: 'Summit Home Services',
    platform: 'google',
    current_rating: 4.2,
    total_reviews: 27,
    last_polled_at: new Date().toISOString(),
    place_id: 'ChIJ_demo_place_id',
    is_active: true,
    connected_at: daysAgo(60),
    user_id: userId,
  };
}

// ─── Main Seed Function ───────────────────────────────────────────────────────

export type SeedData = {
  reviews: SeedReview[];
  customers: SeedCustomer[];
  requests: SeedRequest[];
  businessProfile: SeedBusinessProfile;
};

let _cachedSeedData: SeedData | null = null;

export async function getSeedData(userId: string): Promise<SeedData> {
  if (_cachedSeedData) return _cachedSeedData;

  // Check if we have stored seed data
  const stored = await AsyncStorage.getItem(`${SEED_KEY}_data`);
  if (stored) {
    try {
      _cachedSeedData = JSON.parse(stored);
      return _cachedSeedData!;
    } catch {
      // Regenerate if corrupted
    }
  }

  // Generate fresh seed data
  const customers = generateSeedCustomers();
  const data: SeedData = {
    reviews: generateSeedReviews(),
    customers,
    requests: generateSeedRequests(customers),
    businessProfile: generateSeedBusinessProfile(userId),
  };

  _cachedSeedData = data;
  await AsyncStorage.setItem(`${SEED_KEY}_data`, JSON.stringify(data));

  return data;
}

export async function isDemoSeeded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(SEED_KEY);
  return val === 'true';
}

export async function markDemoSeeded(): Promise<void> {
  await AsyncStorage.setItem(SEED_KEY, 'true');
}

export async function isUsingDemoData(): Promise<boolean> {
  // Returns true if the app is using demo data (no real Supabase connection)
  const stored = await AsyncStorage.getItem(`${SEED_KEY}_data`);
  return stored !== null;
}

export function clearSeedCache(): void {
  _cachedSeedData = null;
}
