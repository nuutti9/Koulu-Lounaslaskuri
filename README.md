This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### AI food analysis

The `/api/analyze` server endpoint uses OpenAI's Responses API with
`gpt-6-luna` for descriptions and meal photos. Existing Supabase authentication,
subscriptions, and free-trial limits still apply.

In the Vercel project, open **Settings → Environment Variables** and add
`OPENAI_API_KEY` with an OpenAI API key to **Production** (and **Preview** if
you want to test preview deployments). Redeploy after saving it. An API key
can be created at <https://platform.openai.com/api-keys>; API usage requires
OpenAI API billing separately from a ChatGPT subscription.

The model defaults to `gpt-6-luna`; `OPENAI_MODEL` is an optional server-side
override. For local development, put these values in `.env.local`. The
`.env.example` file contains empty/example values only; keep the existing
Supabase and Stripe environment variables configured as before.

Never prefix the key with `NEXT_PUBLIC_`, put it into `public/`, or insert it
into a browser bundle or GitHub Pages deployment. The legacy GitHub Pages
and iOS workflows that embedded Gemini secrets have been removed. The
Next.js app requires a server deployment such as Vercel.

Historical Google keys still exist in old public Git commits and the old
`gh-pages` branch. Keep all of those keys revoked; removing the workflows
does not erase Git history. `GEMINI_API_KEY` is no longer used by the app.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
