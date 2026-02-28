import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const from = new Date(now.getTime() + 50 * 60 * 1000); // 50 min from now
    const to = new Date(now.getTime() + 70 * 60 * 1000);   // 70 min from now

    // Get business settings
    const { data: settings } = await supabase
      .from('business_settings')
      .select('shop_name, sms_enabled, apifon_sender_id')
      .limit(1)
      .single();

    if (!settings?.sms_enabled) {
      return new Response(JSON.stringify({ message: 'SMS disabled', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find appointments needing reminders
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

      const text = `Υπενθύμιση: Έχετε ραντεβού σε 1 ώρα στο ${settings.shop_name}. Σας περιμένουμε!`;

      // Call the send-apifon-sms function
      const { error: smsError } = await supabase.functions.invoke('send-apifon-sms', {
        body: {
          to: client.phone_mobile,
          senderId: settings.apifon_sender_id || 'SALON',
          text,
        },
      });

      if (smsError) {
        console.error(`SMS failed for appointment ${appt.id}:`, smsError);
        continue;
      }

      // Mark as sent
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
