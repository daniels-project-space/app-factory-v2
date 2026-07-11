// ReviewPulse — send-sms Edge Function
// Sends SMS review request via Twilio with quota validation
// Called from the Send Request screen
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FREE_SMS_LIMIT = 5;

// --- System templates ---

const SYSTEM_TEMPLATES: Record<string, string> = {
  default:
    "Hi {customer_name}, thanks for choosing {business_name}! We'd love a quick review: {review_link} — Reply STOP to opt out.",
  short:
    "Hi {customer_name}, mind leaving us a review? {review_link} — Reply STOP to opt out.",
  grateful:
    "Hi {customer_name}, thank you for trusting {business_name} with your business! If you have a moment, a review would mean the world: {review_link} — Reply STOP to opt out.",
  hipaa:
    "Hi {customer_name}, thank you for visiting {business_name}. We'd appreciate your feedback: {review_link} — Reply STOP to opt out.",
  post_job:
    "Hi {customer_name}, we hope everything looks great! If you're happy with the work, a review helps us grow: {review_link} — Reply STOP to opt out.",
};

// --- Phone number validation ---

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  // US: 10 digits → +1XXXXXXXXXX
  if (digits.length === 10) return `+1${digits}`;
  // Already has country code: 11+ digits starting with country code
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // International with + prefix
  if (phone.startsWith("+") && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Parse body
    const body = await req.json();
    const {
      customer_name,
      customer_phone,
      customer_id,
      template_id,
      custom_message,
    } = body as {
      customer_name: string;
      customer_phone: string;
      customer_id?: string;
      template_id?: string;
      custom_message?: string;
    };

    // Validate required fields
    if (!customer_name?.trim()) {
      return new Response(
        JSON.stringify({ error: "Customer name is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    const normalizedPhone = normalizePhone(customer_phone ?? "");
    if (!normalizedPhone) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number. Use format: (555) 123-4567 or +1XXXXXXXXXX" }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Atomic quota check-and-increment (prevents concurrent bypass)
    const { data: quotaResult, error: quotaError } = await supabase.rpc(
      "try_increment_sms_quota",
      { p_user_id: user.id }
    );

    if (quotaError) {
      console.error("[send-sms] quota RPC failed:", quotaError.message);
      return new Response(
        JSON.stringify({ error: "Could not validate SMS quota" }),
        { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    if (quotaResult?.error === "profile_not_found") {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    if (!quotaResult?.allowed) {
      return new Response(
        JSON.stringify({
          error: "Free tier limit reached",
          detail: `You've used all ${FREE_SMS_LIMIT} free SMS requests this month. Upgrade to Pro for unlimited requests.`,
          quota_used: quotaResult?.quota_used,
          quota_limit: quotaResult?.quota_limit,
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Fetch business_name for the message template (profile check already done above)
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_name")
      .eq("id", user.id)
      .single();

    // Check opt-out
    if (customer_id) {
      const { data: customer } = await supabase
        .from("customers")
        .select("opted_out")
        .eq("id", customer_id)
        .eq("user_id", user.id)
        .single();

      if (customer?.opted_out) {
        return new Response(
          JSON.stringify({ error: "Customer has opted out of messages" }),
          { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
        );
      }
    }

    // Also check by phone number
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("opted_out, request_count")
      .eq("user_id", user.id)
      .eq("phone", normalizedPhone)
      .single();

    if (existingCustomer?.opted_out) {
      return new Response(
        JSON.stringify({ error: "This phone number has opted out of messages" }),
        { status: 403, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Get business profile for review link
    const { data: businessProfile } = await supabase
      .from("business_profiles")
      .select("id, platform_id, business_name")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("connected_at", { ascending: false })
      .limit(1)
      .single();

    if (!businessProfile?.platform_id) {
      return new Response(
        JSON.stringify({ error: "No connected Google Business Profile found. Connect one first." }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Build review link
    const reviewLink = `https://search.google.com/local/writereview?placeid=${businessProfile.platform_id}`;
    const businessName = businessProfile.business_name ?? profile.business_name ?? "our business";

    // Resolve message content
    let messageContent: string;
    if (custom_message?.trim()) {
      messageContent = custom_message.trim();
    } else {
      // Use template
      const templateKey = template_id ?? "default";
      const templateText = SYSTEM_TEMPLATES[templateKey] ?? SYSTEM_TEMPLATES.default;
      messageContent = templateText
        .replace(/{customer_name}/g, customer_name.split(" ")[0])
        .replace(/{business_name}/g, businessName)
        .replace(/{review_link}/g, reviewLink);
    }

    // Send via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const twilioBody = new URLSearchParams({
      To: normalizedPhone,
      From: TWILIO_PHONE_NUMBER,
      Body: messageContent,
      StatusCallback: `${SUPABASE_URL}/functions/v1/twilio-webhook`,
    });

    const twilioRes = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: twilioBody.toString(),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error("Twilio error:", twilioData);
      const errorMsg =
        twilioData.code === 21211
          ? "Invalid phone number"
          : twilioData.code === 21614
            ? "Phone number cannot receive SMS"
            : "Failed to send SMS";

      return new Response(
        JSON.stringify({ error: errorMsg, detail: twilioData.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
      );
    }

    // Insert review_request record
    const { data: requestRow, error: insertError } = await supabase
      .from("review_requests")
      .insert({
        user_id: user.id,
        customer_id: customer_id ?? null,
        to_name: customer_name.trim(),
        to_phone: normalizedPhone,
        review_link: reviewLink,
        template_id: template_id ?? null,
        message_body: messageContent,
        twilio_sid: twilioData.sid,
        delivery_status: "sent",
        sent_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    // SMS count already incremented atomically by try_increment_sms_quota RPC above

    // Update customer record if linked
    if (customer_id) {
      await supabase
        .from("customers")
        .update({
          last_request_at: new Date().toISOString(),
          request_count: (existingCustomer as any)?.request_count
            ? (existingCustomer as any).request_count + 1
            : 1,
        })
        .eq("id", customer_id)
        .eq("user_id", user.id);
    }

    // Upsert customer if new (save to contacts)
    if (!customer_id && !existingCustomer) {
      await supabase.from("customers").insert({
        user_id: user.id,
        name: customer_name.trim(),
        phone: normalizedPhone,
        request_count: 1,
        last_request_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        request_id: requestRow?.id ?? null,
        status: "sent",
        quota_used: quotaResult?.quota_used ?? null,
        quota_limit: quotaResult?.quota_limit ?? null,
      }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  } catch (err) {
    console.error("send-sms error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...CORS_HEADERS } }
    );
  }
});
