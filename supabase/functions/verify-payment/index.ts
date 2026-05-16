// Supabase Edge Function: verify-payment
// Locatie: supabase/functions/verify-payment/index.ts
// Deploy via: supabase functions deploy verify-payment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { paymentIntentId, userId } = await req.json();
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeKey || !supabaseUrl || !supabaseKey) throw new Error("Configuratie ontbreekt");

    // Controleer betaalstatus bij Stripe
    const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
      headers: { "Authorization": `Bearer ${stripeKey}` },
    });

    const paymentIntent = await response.json();

    if (paymentIntent.status !== "succeeded") {
      return new Response(
        JSON.stringify({ success: false, status: paymentIntent.status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Betaling geslaagd — registreer in database
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from("payments").insert({
      user_id: userId,
      payment_intent_id: paymentIntentId,
      amount: 250,
      currency: "eur",
      status: "succeeded",
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
