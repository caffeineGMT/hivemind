# CLAUDE.md — Rules for ALL agents working in this repo

## FORBIDDEN — Do NOT add any of the following:

1. **No landing pages** — no marketing pages, no hero sections, no "Get Started" CTAs
2. **No monetization** — no Stripe, Paddle, Clerk, payment flows, pricing tiers, promo codes, checkout
3. **No auth/accounts** — no login, signup, user accounts, password hashing, sessions
4. **No SEO marketing** — no Open Graph tags, Twitter Cards, meta descriptions, JSON-LD, canonical URLs
5. **No onboarding wizards** — no first-run flows, welcome screens, setup wizards
6. **No SaaS features** — no subscriptions, billing, usage limits, tier enforcement, promo redemptions
7. **No testimonials** — no review forms, social proof, customer quotes
8. **No partnerships/referrals** — no partner APIs, referral tracking, affiliate systems

## What this project IS:

This is a **LOCAL operational dashboard** for managing AI agent companies. It runs on localhost:3100. It is NOT a SaaS product. It is NOT meant to have paying customers. It is a tool for the owner.

## What you SHOULD work on:

- Agent orchestration reliability
- Task decomposition and execution
- Dashboard UI for monitoring agents, tasks, logs, costs
- Health monitoring and auto-recovery
- Bug fixes and stability improvements

## If you find existing monetization/marketing code:

DELETE IT. Do not preserve it. Do not refactor it. Remove it entirely.
