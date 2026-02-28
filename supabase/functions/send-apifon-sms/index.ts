import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, senderId, text } = await req.json();

    if (!to || !text) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, text' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiToken = Deno.env.get('APIFON_API_TOKEN');
    const apiKey = Deno.env.get('APIFON_API_KEY');

    if (!apiToken || !apiKey) {
      return new Response(JSON.stringify({ error: 'Apifon credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apifon SMS API call
    const response = await fetch('https://ars.apifon.com/services/api/v1/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ApiToken': apiToken,
        'X-ApiKey': apiKey,
      },
      body: JSON.stringify({
        sender_id: senderId || 'SALON',
        recipients: [{ number: to }],
        body: { text },
      }),
    });

    const result = await response.text();

    if (!response.ok) {
      console.error('Apifon API error:', result);
      return new Response(JSON.stringify({ error: 'SMS send failed', details: result }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, result }), {
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
