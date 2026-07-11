// eslint-disable-next-line import/no-unresolved
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// eslint-disable-next-line import/no-unresolved
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Account deletion endpoint — satisfies Apple App Store Guideline 5.1.1(v).
 *
 * Deletes the authenticated user's Supabase auth record and all associated data
 * (journal_entries, user_settings, push_tokens) via CASCADE on the database
 * and removes storage objects in the journal-photos bucket.
 *
 * Must be called with the user's Bearer token (Authorization header).
 * Uses the service-role key server-side to call auth.admin.deleteUser().
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Authenticate the caller using their anon JWT
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Use service-role client to delete the user and all their data
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // Delete storage objects for this user.
  // Photos are stored at <userId>/photos/<date>.jpg, so listing user.id returns
  // a single folder entry [{name:'photos'}] — not the individual files.
  // We must list the photos sub-folder to get the actual file names, then remove
  // each file by its full path to satisfy GDPR Art. 17 right-to-erasure.
  const { data: photoFiles } = await adminClient.storage
    .from('journal-photos')
    .list(`${user.id}/photos`);

  if (photoFiles && photoFiles.length > 0) {
    const paths = photoFiles.map((f) => `${user.id}/photos/${f.name}`);
    await adminClient.storage.from('journal-photos').remove(paths);
  }

  // Delete the auth user — this cascades to journal_entries, user_settings, push_tokens
  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('[DeleteAccount] Failed to delete user:', deleteError.message);
    return new Response(
      JSON.stringify({ error: 'Failed to delete account', details: deleteError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`[DeleteAccount] Deleted user ${user.id}`);
  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
