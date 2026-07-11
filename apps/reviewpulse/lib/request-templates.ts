// ReviewPulse — Pre-built Review Request Templates
// 5 ready-to-use templates with merge fields for SMS/Email review requests

export type RequestTemplate = {
  id: string;
  name: string;
  category: string;
  subject: string; // Email subject line
  body: string;    // Message body with merge fields
  description: string;
  icon: string;
};

// Merge fields: {customer_name}, {business_name}, {review_link}

export const REQUEST_TEMPLATES: RequestTemplate[] = [
  {
    id: 'post-visit',
    name: 'Post-Visit Thank You',
    category: 'Follow-Up',
    subject: 'Thanks for choosing {business_name}!',
    body: 'Hi {customer_name}, thank you for choosing {business_name}! We hope everything exceeded your expectations. If you have a moment, we\'d really appreciate a quick review -- it helps other customers find us and keeps our team motivated.\n\nLeave a review here: {review_link}\n\nThank you for your support!\n\nReply STOP to opt out.',
    description: 'Send right after a customer visit or service completion',
    icon: 'heart',
  },
  {
    id: 'service-complete',
    name: 'Service Completion',
    category: 'Follow-Up',
    subject: 'Your project is complete -- how did we do?',
    body: 'Hi {customer_name}, we\'re happy to let you know that your project with {business_name} is complete! We take pride in every job and would love to hear how we did.\n\nYour honest feedback helps us improve and helps other homeowners make informed decisions.\n\nShare your experience: {review_link}\n\nIf there\'s anything that needs attention, please don\'t hesitate to reach out to us directly.\n\nReply STOP to opt out.',
    description: 'Send after a job or project is fully completed',
    icon: 'check-circle',
  },
  {
    id: 'loyalty',
    name: 'Loyal Customer',
    category: 'Loyalty',
    subject: 'We appreciate your loyalty, {customer_name}!',
    body: 'Hi {customer_name}, as a valued repeat customer of {business_name}, your opinion means the world to us. We\'ve loved working with you and would be grateful if you could share your experience with others.\n\nIt only takes a minute: {review_link}\n\nYour review helps us continue to provide the quality service you\'ve come to expect. Thank you for your continued trust!\n\nReply STOP to opt out.',
    description: 'For repeat customers who know your business well',
    icon: 'star',
  },
  {
    id: 'recovery',
    name: 'Recovery Request',
    category: 'Recovery',
    subject: 'We hope we made things right, {customer_name}',
    body: 'Hi {customer_name}, we wanted to follow up after resolving the issue you experienced with {business_name}. We take every concern seriously and hope we\'ve made things right.\n\nIf you feel we\'ve earned it, we\'d be honored if you\'d share your updated experience: {review_link}\n\nYour feedback -- good or constructive -- helps us do better for every customer. Thank you for giving us the chance to improve.\n\nReply STOP to opt out.',
    description: 'Send after successfully resolving a customer complaint',
    icon: 'refresh-cw',
  },
  {
    id: 'seasonal',
    name: 'Seasonal Check-In',
    category: 'Seasonal',
    subject: 'A quick favor from {business_name}',
    body: 'Hi {customer_name}, hope you\'re having a great season! The team at {business_name} has been working hard to deliver the best service possible, and we\'d love your help spreading the word.\n\nIf you\'ve had a good experience with us, a quick review would mean a lot: {review_link}\n\nThank you for being part of the {business_name} family. We\'re here whenever you need us!\n\nReply STOP to opt out.',
    description: 'Seasonal or periodic outreach to past customers',
    icon: 'calendar',
  },
];

// ─── Preview Helpers ──────────────────────────────────────────────────────────

export function previewTemplate(
  template: RequestTemplate,
  customerName?: string,
  businessName?: string,
): { subject: string; body: string } {
  const name = customerName || 'John';
  const biz = businessName || 'Summit Home Services';
  const link = 'g.page/r/summit-home';

  return {
    subject: template.subject
      .replace(/{customer_name}/g, name)
      .replace(/{business_name}/g, biz)
      .replace(/{review_link}/g, link),
    body: template.body
      .replace(/{customer_name}/g, name)
      .replace(/{business_name}/g, biz)
      .replace(/{review_link}/g, link),
  };
}

export function getTemplatesByCategory(): { category: string; templates: RequestTemplate[] }[] {
  const categories = new Map<string, RequestTemplate[]>();

  for (const t of REQUEST_TEMPLATES) {
    const existing = categories.get(t.category) || [];
    existing.push(t);
    categories.set(t.category, existing);
  }

  return Array.from(categories.entries()).map(([category, templates]) => ({
    category,
    templates,
  }));
}
