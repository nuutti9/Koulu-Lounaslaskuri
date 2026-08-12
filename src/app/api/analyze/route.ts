import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // 1. Check Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Luvaton pääsy. Kirjaudu sisään." }, { status: 401 });
    }

    // 1.5 Check Subscription Status & Rate Limiting (Using Admin client for secure DB read/write)
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('status, usage_count, usage_reset_date, free_analyses_used')
      .eq('user_id', user.id)
      .maybeSingle();

    const isSubscribed = subscription?.status === 'active';
    const freeAnalysesUsed = subscription?.free_analyses_used || 0;

    if (!isSubscribed && freeAnalysesUsed >= 3) {
      return NextResponse.json({ error: "Ilmaiset kokeilut (3/3) on käytetty. Osta tilaus jatkaaksesi tekoälyn käyttöä.", requiresSubscription: true }, { status: 403 });
    }

    // Rate Limiting Logic (10 requests per minute)
    const now = new Date();
    const resetDate = subscription?.usage_reset_date ? new Date(subscription.usage_reset_date) : new Date(0);
    const diffSeconds = (now.getTime() - resetDate.getTime()) / 1000;
    
    let currentUsage = subscription?.usage_count || 0;

    if (diffSeconds > 60) {
      // Reset the window
      currentUsage = 0;
    }

    if (currentUsage >= 10) {
      return NextResponse.json({ error: "Olet tehnyt liian monta pyyntöä lyhyen ajan sisällä. Odota hetki ja yritä uudelleen." }, { status: 429 });
    }

    // 2. Fetch Gemini API Key
    // Note: In production, the key should be retrieved securely from a Supabase Secrets table.
    // For now, we fallback to process.env.GEMINI_API_KEY
    let GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API-avainta ei ole määritetty palvelimella." }, { status: 500 });
    }

    // 3. Parse Request
    const { text, imageData, mimeType, menuItems } = await req.json();

    const promptString = `Olet maailmanluokan ravitsemusterapeutti ja ruoan painon arvioija. Tehtäväsi on tunnistaa ruoat käyttäjän syötteestä, yhdistää ne annettuun valikkoon ja arvioida niiden paino grammoina mahdollisimman suurella tieteellisellä tarkkuudella.

Käytä arvioinnissa seuraavaa logiikkaa:
1. Tilavuus: Arvioi käyttäjän kuvauksen (tai mahdollisen kuvan) perusteella ruoan viemä tila (esim. kourallinen, täysi lautanen, desi).
2. Tiheys: Ota huomioon ainesosan rakenne (esim. salaatti on ilmavaa ja kevyttä, kun taas perunamuusi tai liha on tiivistä ja painavaa).
3. Päättely: Laske paino (tilavuus x tiheys) näiden pohjalta.

Jos kuvasta tai tekstistä tunnistettu ruoka vastaa tai edes muistuttaa jotain valikon ruokaa, yhdistä se siihen parhaan kykysi mukaan (esim. 'perunamuusi' -> valikon 'perunasose', tai 'jauhelihakastike' -> valikon 'jauhelihakastike (m, g)'). Laita 'notFound'-listalle vain asiat, joilla ei kerta kaikkiaan ole mitään loogista vastinetta valikossa.

Valikko (yhdistä havaitut ruoat näihin nimiin): 
${JSON.stringify(menuItems)}

Käyttäjän antama lisäkuvaus (voi olla tyhjä, jos mukana on vain kuva): "${text}"

TÄRKEÄÄ: Palauta vastauksesi PELKÄSTÄÄN validina JSON-objektina ilman mitään markdown-koodiblokkeja tai ylimääräistä tekstiä. Seuraava rakenne on pakollinen:
{
  "reasoning": "Kirjoita tähän lyhyt, 1-2 lauseen analyysi, jossa perustelet arvioimasi tilavuudet ja tiheydet ennen lopputulosta.",
  "menuResults": {
    "Ruokalajin nimi valikosta": 150
  },
  "notFound": [
    "lista",
    "löytymättömistä",
    "ruoista"
  ]
}`;

    const parts: any[] = [{ text: promptString }];
    
    if (imageData && mimeType) {
      parts.push({ inlineData: { data: imageData, mimeType } });
    }

    // 4. Call Gemini
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] }),
      }
    );

    const d = await resp.json();
    if (!d.candidates || d.candidates.length === 0) {
      return NextResponse.json({ error: "Tekoäly ei osannut analysoida kuvaa tai tekstiä kunnolla. Yritä uudelleen selkeämmällä kuvalla." }, { status: 400 });
    }

    let results;
    try {
      results = JSON.parse(d.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim());
    } catch (pe) {
      return NextResponse.json({ error: "Tekoälyn vastaus ei ollut luettavassa muodossa." }, { status: 500 });
    }

    // Securely update usage limits after a successful generation
    await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        status: subscription?.status || 'inactive',
        usage_count: currentUsage + 1,
        usage_reset_date: currentUsage === 0 ? now.toISOString() : subscription?.usage_reset_date,
        free_analyses_used: isSubscribed ? freeAnalysesUsed : freeAnalysesUsed + 1
      });

    const freeAnalysesRemaining = isSubscribed ? null : Math.max(0, 3 - (freeAnalysesUsed + 1));

    return NextResponse.json({ ...results, freeAnalysesRemaining });
    
  } catch (error: any) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Palvelinvirhe analyysin aikana." }, { status: 500 });
  }
}
