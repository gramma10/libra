import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 3;
// Backoff in minutes: attempt 1 -> 5min, 2 -> 15min, 3 -> 45min
const BACKOFF_MINUTES = [5, 15, 45];

function ensureCountryPrefix(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  const digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  if (digits.startsWith('30')) return digits;
  return '30' + digits;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    // Reminder time-window: appointments starting 50–70 min from now (deterministic)
    const from = new Date(now.getTime() + 50 * 60 * 1000);
    const to = new Date(now.getTime() + 70 * 60 * 1000);

    const { data: enabledSettings, error: settingsError } = await supabase
      .from('business_settings')
      .select('shop_id, shop_name')
      .eq('sms_enabled', true);

    if (settingsError) {
      return new Response(JSON.stringify({ error: settingsError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!enabledSettings || enabledSettings.length === 0) {
      return new Response(JSON.stringify({ message: 'No shops with SMS enabled', sent: 0, failed: 0, skipped: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const enabledShopIds = enabledSettings.map(s => s.shop_id);
    const shopNameMap = Object.fromEntries(enabledSettings.map(s => [s.shop_id, s.shop_name]));

    // Pull candidates: not yet sent, in the time window, in an active status,
    // and either never attempted OR retry window has elapsed, AND below max attempts.
    const nowIso = now.toISOString();
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, start_time, client_id, shop_id, reminder_attempts, clients!appointments_client_fk(first_name, phone_mobile)')
      .eq('reminder_sent', false)
      .neq('status', 'Cancelled')
      .neq('status', 'No-Show')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())
      .lt('reminder_attempts', MAX_ATTEMPTS)
      .or(`reminder_next_retry_at.is.null,reminder_next_retry_at.lte.${nowIso}`)
      .in('shop_id', enabledShopIds);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sent = 0, failed = 0, skipped = 0;

    for (const appt of appointments || []) {
      const client = (appt as any).clients;
      if (!client?.phone_mobile) {
        skipped++;
        await supabase.from('appointments')
          .update({ reminder_last_error: 'no_phone', reminder_attempts: MAX_ATTEMPTS })
          .eq('id', appt.id);
        continue;
      }

      const phoneNumber = ensureCountryPrefix(client.phone_mobile);
      const shopName = shopNameMap[appt.shop_id] || 'our salon';
      const text = `Υπενθύμιση: Έχετε ραντεβού σε 1 ώρα στο ${shopName}. Σας περιμένουμε!`;

      const { error: smsError } = await supabase.functions.invoke('send-apifon-sms', {
        body: { to: phoneNumber, text },
      });

      const attempts = (appt as any).reminder_attempts ?? 0;

      if (smsError) {
        const nextAttempt = attempts + 1;
        const reachedMax = nextAttempt >= MAX_ATTEMPTS;
        const backoff = BACKOFF_MINUTES[Math.min(nextAttempt, BACKOFF_MINUTES.length - 1)];
        const nextRetry = reachedMax ? null : new Date(Date.now() + backoff * 60 * 1000).toISOString();

        await supabase.from('appointments').update({
          reminder_attempts: nextAttempt,
          reminder_last_error: String(smsError.message ?? smsError),
          reminder_next_retry_at: nextRetry,
        }).eq('id', appt.id);
        failed++;
        continue;
      }

      await supabase.from('appointments').update({
        reminder_sent: true,
        reminder_last_error: null,
        reminder_next_retry_at: null,
      }).eq('id', appt.id);
      sent++;
    }

    return new Response(JSON.stringify({
      success: true, sent, failed, skipped,
      window: { from: from.toISOString(), to: to.toISOString() },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
