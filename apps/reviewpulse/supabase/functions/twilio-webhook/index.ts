// ReviewPulse — twilio-webhook Edge Function
// Handles Twilio delivery status callbacks and STOP opt-out messages
// No JWT auth — validated via Twilio signature
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   TWILIO_AUTH_TOKEN (for signature validation)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// --- Twilio signature validation ---

function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  // Build the data string: URL + sorted params key+value pairs
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  // HMAC-SHA1 with Twilio auth token
  const expectedSig = hmac("sha1", TWILIO_AUTH_TOKEN, data, "utf8", "base64");
  return expectedSig === signature;
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Parse form data from Twilio
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = String(value);
    }

    // Validate Twilio signature
    const twilioSignature = req.headers.get("X-Twilio-Signature") ?? "";
    const webhookUrl = `${SUPABASE_URL}/functions/v1/twilio-webhook`;

    // Enforce signature validation by default, skip only in development
    const isValid = validateTwilioSignature(webhookUrl, params, twilioSignature);
    if (!isValid && Deno.env.get("ENVIRONMENT") !== "development") {
      console.error("Invalid Twilio signature");
      return new Response("Forbidden", { status: 403 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Determine event type: status callback or incoming message
    const messageSid = params.MessageSid ?? params.SmsSid;
    const messageStatus = params.MessageStatus;
    const incomingBody = params.Body?.trim().toUpperCase();
    const fromNumber = params.From;

    // --- Handle delivery status updates ---
    if (messageStatus && messageSid) {
      const statusMap: Record<string, string> = {
        queued: "sent",
        sent: "sent",
        delivered: "delivered",
        undelivered: "failed",
        failed: "failed",
      };

      const mappedStatus = statusMap[messageStatus] ?? messageStatus;

      const updateData: Record<string, unknown> = {
        delivery_status: mappedStatus,
      };

      if (messageStatus === "delivered") {
        updateData.delivered_at = new Date().toISOString();
      }

      if (messageStatus === "failed" || messageStatus === "undelivered") {
        updateData.error_message =
          params.ErrorMessage ?? params.ErrorCode ?? "Delivery failed";
      }

      const { error } = await supabase
        .from("review_requests")
        .update(updateData)
        .eq("twilio_sid", messageSid);

      if (error) {
        console.error("Status update error:", error);
      }

      console.log(`Status update: ${messageSid} → ${mappedStatus}`);

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          headers: { "Content-Type": "text/xml", ...CORS_HEADERS },
        }
      );
    }

    // --- Handle incoming STOP messages (opt-out) ---
    if (
      incomingBody &&
      fromNumber &&
      ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(
        incomingBody
      )
    ) {
      // Normalize phone number
      const normalizedPhone = fromNumber.startsWith("+")
        ? fromNumber
        : `+${fromNumber.replace(/\D/g, "")}`;

      // Find all customers with this phone number and mark opt-out
      const { data: customers, error: findError } = await supabase
        .from("customers")
        .select("id, user_id")
        .eq("phone", normalizedPhone);

      if (findError) {
        console.error("Customer lookup error:", findError);
      }

      if (customers && customers.length > 0) {
        const { error: updateError } = await supabase
          .from("customers")
          .update({
            opted_out: true,
            opted_out_at: new Date().toISOString(),
          })
          .eq("phone", normalizedPhone);

        if (updateError) {
          console.error("Opt-out update error:", updateError);
        }

        console.log(
          `Opt-out processed: ${normalizedPhone} (${customers.length} customer records)`
        );
      } else {
        console.log(
          `Opt-out from unknown number: ${normalizedPhone} — no customer records found`
        );
      }

      // Twilio auto-handles STOP responses (sends "You have been unsubscribed"),
      // so we return an empty TwiML response
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        {
          headers: { "Content-Type": "text/xml", ...CORS_HEADERS },
        }
      );
    }

    // --- Unknown webhook event ---
    console.log("Unhandled webhook event:", params);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { "Content-Type": "text/xml", ...CORS_HEADERS },
      }
    );
  } catch (err) {
    console.error("twilio-webhook error:", err);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        status: 500,
        headers: { "Content-Type": "text/xml", ...CORS_HEADERS },
      }
    );
  }
});
