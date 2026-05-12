# GirlMath v2 — Feature Checklist

---

## 🔁 Core Migration
- [ ] Remove price search feature entirely
- [ ] Remove `PriceCheckResultCard` component
- [ ] Remove `priceCheck.ts` util and backend route
- [ ] Replace price search screen with **Spend Log screen** (category + amount + item name → personality reaction)

---

## 🆓 Free Tier
- [ ] Lock personality modes — free users get **Responsible only**
- [ ] Cap history to **last 7 entries** for free users
- [ ] Free users get **1 budget category** (misc)
- [ ] Show streak counter but lock it behind premium gate

---

## 💎 Tier 1 — Premium (Coded Logic)

- [ ] **All 3 personality modes** unlocked (Delulu, Chaotic, Responsible)
- [ ] **Unlimited history** log
- [ ] **Budget categories with limits** — unlimited custom categories per pay period
- [ ] **Pay period summary card** — total spent, biggest splurge, category breakdown at end of period
- [ ] **Custom aura meter themes** — color palettes (clean girl, Y2K, dark academia)
- [ ] **Spending streaks** — "5 days under budget 🔥" tracker

---

## 💎 Tier 2 — Premium (Medium Effort)

- [ ] **Savings goals** — set a named goal + target amount, track progress from spendable with fill bar
- [ ] **Recurring expenses tracker** — log subscriptions, auto-deduct from spendable each period
- [ ] **Impulse cooldown timer** — set a 24/48/72hr wait on an item, get reminded, personality asks if you still want it
- [ ] **No-spend day tracker** — log no-spend days, personality reacts in chosen mode
- [ ] **Budget rollover** — underspend in a category → carry remainder to next period

---

## 💎 Tier 3 — Premium (Bigger Builds)

- [ ] **Home screen widget** — shows spendable left this pay period (iOS WidgetKit)
- [ ] **Shared budgets** — split bills/budget with a partner or friend
- [ ] **Export to CSV** — one-tap history export
- [ ] **Receipt scanner** — camera → parse item name + price → auto-fill spend log

---

## 💳 Paywall Pitch (launch with these 4)
- [ ] Personality lock (Delulu + Chaotic)
- [ ] Unlimited custom budget categories
- [ ] Full history
- [ ] Pay period recap card
