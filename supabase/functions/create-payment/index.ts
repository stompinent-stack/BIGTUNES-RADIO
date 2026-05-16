// Supabase Edge Function: create-payment
// Locatie: supabase/functions/create-payment/index.ts
// Deploy via: supabase functions deploy create-payment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trackTitle, artistName, userId, returnUrl } = await req.json();
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeKey) throw new Error("Stripe key niet geconfigureerd");
    if (!trackTitle || !userId) throw new Error("Ongeldige invoer");

    // Maak Stripe Payment Intent aan voor iDEAL
    const response = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: "250", // €2,50 in centen
        currency: "eur",
        "payment_method_types[]": "ideal",
        description: `BIGTUNES RADIO — Upload: ${trackTitle} van ${artistName}`,
        metadata: JSON.stringify({ userId, trackTitle, artistName }),
        return_url: returnUrl || "https://bigtunes-radio.vercel.app",
      }),
    });

    const paymentIntent = await response.json();

    if (paymentIntent.error) {
      throw new Error(paymentIntent.error.message);
    }

    return new Response(
      JSON.stringify({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
