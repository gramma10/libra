import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function generateHmacSignature(
  secretKey: string,
  method: string,
  uri: string,
  body: string,
  date: string
): Promise<string> {
  const stringToSign = `${method}\n${uri}\n${body}\n${date}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(stringToSign);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  return base64Encode(new Uint8Array(signature));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    const apiSecret = Deno.env.get('APIFON_API_KEY');

    if (!apiToken || !apiSecret) {
      console.error('Missing secrets - APIFON_API_TOKEN:', !!apiToken, 'APIFON_API_KEY:', !!apiSecret);
      return new Response(JSON.stringify({ error: 'Apifon credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = JSON.stringify({
      subscribers: [{ number: to }],
      message: { text },
    });

    const method = 'POST';
    const uri = '/services/api/v1/sms/send';
    const date = new Date().toUTCString();

    const signature = await generateHmacSignature(apiSecret, method, uri, requestBody, date);

    console.log('Sending SMS to:', to, 'with sender:', senderId || 'SALON');
    console.log('Date header:', date);
    console.log('URI:', uri);

    const response = await fetch(`https://ars.apifon.com${uri}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-ApifonWS-Date': date,
        'Authorization': `ApifonWS ${apiToken}:${signature}`,
      },
      body: requestBody,
    });

    const result = await response.text();
    console.log('Apifon response status:', response.status, 'body:', result);

    if (!response.ok) {
      return new Response(JSON.stringify({ 
        error: 'SMS send failed', 
        details: result, 
        status: response.status 
      }), {
        status: 200,
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
