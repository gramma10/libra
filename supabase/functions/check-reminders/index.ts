import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function ensureCountryPrefix(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  const digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  if (digits.startsWith('30')) {
    return digits;
  }
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

    // Get all shops with SMS enabled
    const { data: enabledSettings, error: settingsError } = await supabase
      .from('business_settings')
      .select('shop_id, shop_name')
      .eq('sms_enabled', true);

    if (settingsError) {
      console.error('Settings query error:', settingsError);
      return new Response(JSON.stringify({ error: settingsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!enabledSettings || enabledSettings.length === 0) {
      console.log('No shops with SMS enabled');
      return new Response(JSON.stringify({ message: 'No shops with SMS enabled', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const enabledShopIds = enabledSettings.map(s => s.shop_id);
    const shopNameMap = Object.fromEntries(enabledSettings.map(s => [s.shop_id, s.shop_name]));

    console.log(`Found ${enabledShopIds.length} shops with SMS enabled, checking appointments between ${from.toISOString()} and ${to.toISOString()}`);

    // Find appointments needing reminders across all SMS-enabled shops
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('id, start_time, client_id, shop_id, clients!appointments_client_fk(first_name, phone_mobile)')
      .eq('reminder_sent', false)
      .neq('status', 'Cancelled')
      .neq('status', 'No-Show')
      .gte('start_time', from.toISOString())
      .lte('start_time', to.toISOString())
      .in('shop_id', enabledShopIds);

    if (error) {
      console.error('Query error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${appointments?.length || 0} appointments needing reminders`);

    let sentCount = 0;

    for (const appt of appointments || []) {
      const client = (appt as any).clients;
      if (!client?.phone_mobile) {
        console.log(`Skipping appointment ${appt.id}: no phone number`);
        continue;
      }

      const phoneNumber = ensureCountryPrefix(client.phone_mobile);
      const shopName = shopNameMap[appt.shop_id] || 'our salon';
      const text = `Υπενθύμιση: Έχετε ραντεβού σε 1 ώρα στο ${shopName}. Σας περιμένουμε!`;

      console.log(`Sending SMS to ${phoneNumber} for appointment ${appt.id} (shop: ${shopName})`);

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

      await supabase
        .from('appointments')
        .update({ reminder_sent: true })
        .eq('id', appt.id);

      sentCount++;
      console.log(`SMS sent successfully for appointment ${appt.id}`);
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
