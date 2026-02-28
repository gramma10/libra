import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function ensureCountryPrefix(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  // Remove leading + if present
  const digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  // If already starts with 30, return as-is
  if (digits.startsWith('30')) {
    return digits;
  }
  // Otherwise prepend 30
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
    const from = new Date(now.getTime() + 50 * 60 * 1000);
    const to = new Date(now.getTime() + 70 * 60 * 1000);

    // Get business settings
    const { data: settings } = await supabase
      .from('business_settings')
      .select('shop_name, sms_enabled')
      .limit(1)
      .single();

    if (!settings?.sms_enabled) {
      return new Response(JSON.stringify({ message: 'SMS disabled', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find appointments needing reminders (50-70 min from now, reminder_sent = false)
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, start_time, client_id, clients(first_name, phone_mobile)')
      .eq('reminder_sent', false)
      .neq('status', 'Cancelled')
      .neq('status', 'No-Show')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString());

    if (error) {
      console.error('Query error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sentCount = 0;

    for (const appt of appointments || []) {
      const client = (appt as any).clients;
      if (!client?.phone_mobile) continue;

      const phoneNumber = ensureCountryPrefix(client.phone_mobile);
      const text = `Υπενθύμιση: Έχετε ραντεβού σε 1 ώρα στο ${settings.shop_name}. Σας περιμένουμε!`;

      // Call send-apifon-sms with minimal payload (subscribers + message only)
      const { error: smsError } = await supabase.functions.invoke('send-apifon-sms', {
        body: {
          to: phoneNumber,
          text,
        },
      });

      if (smsError) {
        console.error(`SMS failed for appointment ${appt.id}:`, smsError);
        continue;
      }

      // Mark as sent immediately after success
      await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appt.id);

      sentCount++;
    }

    return new Response(JSON.stringify({ success: true, sent: sentCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
