import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export const maxDuration = 60;

type InputPart =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail: 'auto' };

type AnalysisResult = {
  reasoning: string;
  menuResults: Record<string, number>;
  notFound: string[];
};

type OpenAIResponse = {
  status?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

function isAnalysisResult(value: unknown, menuItems: string[]): value is AnalysisResult {
  if (typeof value !== 'object' || value === null) return false;
  const result = value as Partial<AnalysisResult>;
  return (
    typeof result.reasoning === 'string' &&
    Array.isArray(result.notFound) &&
    result.notFound.every((item) => typeof item === 'string') &&
    typeof result.menuResults === 'object' &&
    result.menuResults !== null &&
    !Array.isArray(result.menuResults) &&
    Object.entries(result.menuResults).every(([name, grams]) =>
      menuItems.includes(name) && typeof grams === 'number' && Number.isFinite(grams) && grams >= 0
    ) &&
    menuItems.every((name) => Object.hasOwn(result.menuResults!, name))
  );
}

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

    // This variable stays on the server; never use a NEXT_PUBLIC_ key.
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "Tekoälypalvelua ei ole määritetty palvelimella." }, { status: 503 });
    }

    // 3. Parse Request
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Virheellinen analyysipyyntö." }, { status: 400 });
    }
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: "Virheellinen analyysipyyntö." }, { status: 400 });
    }
    const { text = '', imageData, mimeType, menuItems: requestedMenuItems } = body as Record<string, unknown>;
    if (
      typeof text !== 'string' || text.length > 6000 ||
      !Array.isArray(requestedMenuItems) || requestedMenuItems.length === 0 || requestedMenuItems.length > 200 ||
      !requestedMenuItems.every((item) => typeof item === 'string' && item.trim() && item.length <= 300) ||
      (!text.trim() && !imageData)
    ) {
      return NextResponse.json({ error: "Lisää kuva tai kuvaus ja valitse ruokalista." }, { status: 400 });
    }
    if (imageData != null && (
      typeof imageData !== 'string' || !imageData || imageData.length > 4_000_000 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(imageData) ||
      typeof mimeType !== 'string' || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)
    )) {
      return NextResponse.json({ error: "Kuva on liian suuri tai sen tiedostomuotoa ei tueta. Käytä JPG-, PNG-, WebP- tai GIF-kuvaa." }, { status: 400 });
    }
    const menuItems = [...new Set(requestedMenuItems as string[])];

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

    const parts: InputPart[] = [{ type: 'input_text', text: promptString + '\nPalauta jokainen valikon ruokalaji menuResults-objektissa. Käytä painoa 0, jos ruokalajia ei havaita.' }];
    
    if (imageData && mimeType) {
      parts.push({ type: 'input_image', image_url: `data:${mimeType};base64,${imageData}`, detail: 'auto' });
    }

    // 4. Call OpenAI from the server. Authentication is never placed in a URL.
    const resp = await fetch(
      'https://api.openai.com/v1/responses',
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(45_000),
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-6-luna',
          store: false,
          reasoning: { effort: 'low' },
          max_output_tokens: 2500,
          input: [{ role: 'user', content: parts }],
          text: {
            format: {
              type: 'json_schema',
              name: 'food_analysis',
              strict: true,
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['reasoning', 'menuResults', 'notFound'],
                properties: {
                  reasoning: { type: 'string' },
                  menuResults: {
                    type: 'object',
                    additionalProperties: false,
                    required: menuItems,
                    properties: Object.fromEntries(menuItems.map((name) => [name, { type: 'number', minimum: 0 }])),
                  },
                  notFound: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        }),
      }
    );

    if (!resp.ok) {
      // Do not log upstream bodies or request headers, which may contain sensitive data.
      console.error('OpenAI request failed', { status: resp.status, requestId: resp.headers.get('x-request-id') });
      return NextResponse.json({ error: "Tekoälypalvelu ei ole juuri nyt käytettävissä. Yritä myöhemmin uudelleen." }, { status: resp.status === 429 ? 429 : 502 });
    }

    const d = await resp.json() as OpenAIResponse;
    if (d.status !== 'completed' || !Array.isArray(d.output)) {
      return NextResponse.json({ error: "Tekoälyn analyysi jäi kesken. Yritä uudelleen." }, { status: 502 });
    }
    const content = d.output
      .filter((item) => item.type === 'message' && Array.isArray(item.content))
      .flatMap((item) => item.content ?? []);
    if (content.some((part) => part.type === 'refusal')) {
      return NextResponse.json({ error: "Tekoäly ei osannut analysoida kuvaa tai tekstiä kunnolla. Yritä uudelleen selkeämmällä kuvalla." }, { status: 400 });
    }

    let results: AnalysisResult;
    try {
      const outputText = content.filter((part) => part.type === 'output_text').map((part) => part.text ?? '').join('');
      const parsed: unknown = JSON.parse(outputText);
      if (!isAnalysisResult(parsed, menuItems)) {
        throw new Error('Invalid analysis response');
      }
      results = parsed;
    } catch {
      return NextResponse.json({ error: "Tekoälyn vastaus ei ollut luettavassa muodossa." }, { status: 502 });
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
    
  } catch (error: unknown) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return NextResponse.json({ error: "Tekoälypalvelun vastaus kesti liian kauan. Yritä uudelleen." }, { status: 504 });
    }
    console.error("Analysis failed", { name: error instanceof Error ? error.name : 'UnknownError' });
    return NextResponse.json({ error: "Palvelinvirhe analyysin aikana." }, { status: 500 });
  }
}
