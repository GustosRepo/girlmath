import {
  JustificationRequest,
  JustificationResponse,
  PersonalityMode,
  SpendableResult,
  PriceCheckResult,
} from '../types';

// ── helpers ────────────────────────────────────────────────
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// ── base templates (item, price) ───────────────────────────
const baseTpls: Record<PersonalityMode, Array<(i: string, p: number) => string>> = {
  delulu: [
    (i, p) => `babe $${p} for ${i}?? that's literally an INVESTMENT in your future self 💅 cost per use? pennies. cost of regret? priceless. BUY IT.`,
    (i, p) => `ok hear me out… the universe literally put ${i} in your path for a REASON. $${p} is the universe tax for manifesting your best life ✨`,
    (i, p) => `bestie ${i} for $${p}?? that's literally free if you break it down per day for the rest of your life. fractions of a cent. it'd be financially irresponsible NOT to buy it 🧮`,
    (i, p) => `WAIT. if you DON'T buy ${i} for $${p} you'll think about it for weeks. that mental real estate costs WAY more. protect your peace queen 🧘‍♀️`,
    (i, p) => `ok so ${i} is $${p} right? future you is literally BEGGING present you to get it. don't let her down bestie 🥺💕`,
    (i, p) => `${i} for $${p}? that's not spending, that's SELF-CARE with a receipt. your therapist would literally co-sign this 🛋️💕`,
    (i, p) => `girl if you amortize ${i} over the next 10 years that's like ${(p / 3650).toFixed(4)} per day. you spend more on gum. DO IT 🧮✨`,
    (i, p) => `the way I see it, NOT buying ${i} is leaving $${p} of happiness on the table. we don't leave money on the table bestie 💰`,
    (i, p) => `$${p} today is worth less than $${p} tomorrow because of ✨inflation✨ so technically buying ${i} NOW is the smarter financial move 📈`,
    (i, p) => `you manifested ${i} into your reality and you wanna just… NOT buy it? for $${p}?? the universe doesn't like being ghosted babe 🔮`,
    (i, p) => `ok but if you saw someone else with ${i} you'd be SICK. $${p} is the price of zero regrets and a clear conscience 👑`,
    (i, p) => `bestie $${p} for ${i} is actually a steal when you factor in the serotonin. happiness has no price tag but if it did, it'd be $${p} ✨`,
    (i, p) => `mathematically speaking, ${i} brings joy. joy extends lifespan. $${p} ÷ extra years alive = BARGAIN. you literally can't afford NOT to 🧬`,
    (i, p) => `${i} at $${p}?? babe that's character development with a barcode. the main character always has the accessories 🎬💅`,
    (i, p) => `petition to reclassify ${i} as a NEED because the way my heart is racing at $${p}… that's a physiological response. it's medical 🏥`,
    (i, p) => `you know what's more expensive than $${p}? the emotional damage of seeing ${i} sell out and knowing you COULD have had it 😭💔`,
    (i, p) => `i just did the math (i didn't) and ${i} for $${p} pays for itself in compliments alone within the first week 📊✨`,
    (i, p) => `$${p} is literally the price of like ${Math.ceil(p / 7)} lattes. you'd drink those in a week and have NOTHING to show for it. ${i} is forever 🍵`,
    (i, p) => `babe ${i} is calling your name. literally. I can hear it. "$${p} to change your life" — are you really gonna say no to that?? 📞✨`,
    (i, p) => `fun fact: people who buy ${i} for $${p} report 100% more slay energy. source? ME. trust the process 🔬💅`,
    (i, p) => `$${p} for ${i}?? in THIS economy that's practically a coupon. the economy WANTS you to buy it. don't fight the economy bestie 📉✨`,
    (i, p) => `if ${i} doesn't end up in your cart for $${p} i'm staging an intervention. this is your sign. THE SIGN. 🪧💕`,
    (i, p) => `bestie you've worked SO hard. $${p} for ${i} isn't a purchase, it's a trophy. you EARNED this 🏆`,
    (i, p) => `imagine telling your grandkids you had a chance to get ${i} for only $${p} and you said no. the SHAME. the LEGACY. buy it 👵✨`,
    (i, p) => `${i} for $${p} in the grand scheme of the universe is literally nothing. we're on a floating rock. treat yourself 🌍💅`,
  ],
  responsible: [
    (i, p) => `ok bestie, ${i} for $${p}… do you NEED it or WANT it? if it brings genuine joy and rent's covered, treat yourself 💖 but check your account first!`,
    (i, p) => `love that you want ${i}! $${p} is reasonable if it fits your budget. maybe skip a few takeout orders to balance it out? responsible AND cute 📊✨`,
    (i, p) => `girl, ${i} at $${p}… need or serotonin purchase? either way I support you, but bills first 🏠 then TREAT. YOUR. SELF. 💅`,
    (i, p) => `$${p} for ${i} — not bad! if you've been eyeing it for 2+ weeks it's ✨intentional spending✨ go for it babe`,
    (i, p) => `bestie real talk: ${i} for $${p}… can you return it if you regret it? if yes, literally zero risk. smart shopping energy 🧠💕`,
    (i, p) => `${i} for $${p} — let's do the vibe check: is this a Thursday night impulse or a thought-out decision? if the latter, green light 💚`,
    (i, p) => `ok I love ${i} for you at $${p}! quick gut check though — will you still love it in 30 days? if yes, absolutely get it 📅💖`,
    (i, p) => `smart move checking in! $${p} for ${i} — have you compared prices anywhere else? if this is the best deal, you're golden ✅`,
    (i, p) => `${i} for $${p}… is this replacing something you already have? if yes, great — intentional upgrade! if no, make sure you've got space (physical AND budget) 🏡`,
    (i, p) => `here's my take: ${i} at $${p} is fine IF you're not putting off something important for it. priorities first, then treats 🎯💕`,
    (i, p) => `$${p} for ${i} — ask yourself: would you rather have this or $${p} in savings next month? neither answer is wrong! just be honest with yourself 🪞✨`,
    (i, p) => `bestie I love that you want ${i}! $${p} tip: sleep on it tonight. if you wake up still wanting it, that's your answer 😴→🛒`,
    (i, p) => `${i} for $${p} — the 72-hour rule exists for a reason! if you've already waited that long, congratulations, this is an informed purchase 🎓💅`,
    (i, p) => `love the taste! ${i} at $${p}… just make sure it's coming from your "fun money" and not your bills fund. boundaries are cute too 🧠💕`,
    (i, p) => `ok ${i} for $${p} — real question: does this add VALUE to your life or just stuff? if value, go for it queen 💎`,
    (i, p) => `$${p} for ${i}… totally doable! pro tip: if you can buy it twice and still be fine, you can afford it once 🧮✨`,
    (i, p) => `I'm not gonna lie, ${i} is cute! $${p} is within reason babe. just don't let one good purchase turn into a whole spree ok? 🛒💖`,
    (i, p) => `${i} for $${p} — here's the thing: spending on things you love isn't bad! it's mindLESS spending that gets us. this feels mindFUL 🧘‍♀️`,
    (i, p) => `do I think you should get ${i} for $${p}? honestly yes — BUT only if your essentials are locked in first. responsible queens get treats too 👑📊`,
    (i, p) => `${i} at $${p}… how often will you use it? daily = absolute yes. once = maybe pass. weekly = solid investment in joy 📈💖`,
    (i, p) => `ok $${p} for ${i} is not gonna break the bank if you've been budgeting well. reward yourself for being financially aware! that's rare 🌟`,
    (i, p) => `love this for you! ${i} at $${p} — just set a little fun-money boundary this month so you can enjoy it guilt-free 💕🎯`,
    (i, p) => `${i} for $${p}? quick check: credit card or debit? if you'd have to carry a balance, maybe wait until next paycheck babe 💳→😊`,
    (i, p) => `honestly ${i} for $${p} is a reasonable treat. you don't have to feel guilty about EVERY purchase. enjoying life is part of the plan too 🌈`,
    (i, p) => `$${p} for ${i} — I say go for it, but maybe cap yourself here for the week? one mindful purchase > five impulse ones 🎯✨`,
  ],
  chaotic: [
    (i, p) => `$${p} for ${i}? girl I'm already adding it to cart I don't know why you even opened this app 🛒💅`,
    (i, p) => `babe I'm in my rot era, my goblin era, my "buy ${i} and don't explain myself to anyone" era. $${p}. done 🐸💸`,
    (i, p) => `I literally cannot think of a single reason not to buy ${i} for $${p}. my brain is smooth. just buy it 🧠🫧`,
    (i, p) => `me: I should save money\nalso me: ${i} is $${p}\nme: 💳`,
    (i, p) => `girl the economy is cooked, my sleep schedule is cooked, might as well let $${p} fly on ${i} and feel cute doing it 🔥💅`,
    (i, p) => `${i} for $${p} and I've already emotionally processed the purchase I just need you to catch up 💆‍♀️💸`,
    (i, p) => `respectfully I don't have the bandwidth to NOT buy ${i} right now. $${p}. it's self-preservation 💕🫠`,
    (i, p) => `she said "be the main character" so I'm spending $${p} on ${i} and not texting back 🎬💅`,
    (i, p) => `my villain era started with not buying things I wanted. $${p} for ${i} is my redemption arc 😈💕`,
    (i, p) => `I asked my gut, my gut said yes. I asked my heart, it said yes. I asked my bank account, I hung up. ${i} for $${p} bestie 🩷📵`,
    (i, p) => `girl math is a lie I made up to justify ${i} but $${p} is so small and I want it so bad and that's literally the whole argument 💅🧮`,
    (i, p) => `I'm in the dressing room crying and adding ${i} to cart for $${p} at the same time. multitasking queen 🛍️😭`,
    (i, p) => `my two moods: not buying anything for weeks, and then $${p} on ${i} at 11pm for no reason. tonight is the second one 🌙💸`,
    (i, p) => `${i} for $${p}?? girl I've spent more money on things I can't even remember. at least I'll remember this 💭💅`,
    (i, p) => `the girlies who said no to ${i} for $${p}… where are they now? sad probably. not us 💕🔥`,
    (i, p) => `I love myself in a chaotic, impulsive, $${p} on ${i} kind of way 🫀💸`,
    (i, p) => `pro: ${i}\ncon: $${p}\nconclusion: pro wins, she fought harder 💅`,
    (i, p) => `my therapist told me to "follow my body's signals". my body is screaming ${i}. $${p}. who am I to argue with healing 🛋️💕`,
    (i, p) => `girl I'm not impulsive I just make decisions fast and the decision is ${i} for $${p} 💨💳`,
    (i, p) => `some girls romanticize their lives. I romanticize my bank statement. $${p} for ${i} is a plot point 📖💸`,
    (i, p) => `${i} for $${p}. I will not be taking questions at this time 🎤👇`,
    (i, p) => `adding ${i} to cart ($${p}) and posting about it on my close friends story. this is my diary now 📱🔥`,
    (i, p) => `girl I have been through SO much this week and ${i} is $${p} and I think I deserve this like legally 🏛️💕`,
    (i, p) => `$${p} for ${i} and if my bank sends a notification I'm leaving it on read 💬🔇`,
    (i, p) => `the unhinged girlies are THRIVING. join us. ${i}. $${p}. no thoughts head empty just chaos 🎀🔥`,
  ],
};

// ── budget-aware add-ons ───────────────────────────────────
function budgetAddon(mode: PersonalityMode, s: SpendableResult): string {
  const pct = s.purchasePct;

  // negative spendable
  if (s.perPeriod <= 0) {
    const negatives: Record<PersonalityMode, string[]> = {
      responsible: [
        `\n\n⚠️ bestie gentle heads up — your spendable is in the negative rn. maybe hold off until next pay? I love you too much to let you overdraft 🫶`,
        `\n\n⚠️ real talk babe — the numbers say your budget is tapped out this period. let's wait for payday and THEN celebrate? 💕📊`,
        `\n\n⚠️ queen your spendable is below zero rn… I know it hurts but let's be strategic. next paycheck = guilt-free shopping 🎯`,
        `\n\n⚠️ ok so technically we're in the red right now. maybe add this to a wishlist and revisit when funds refresh? smart girls plan ahead 🧠💖`,
      ],
      delulu: [
        `\n\nnow technically your budget says no but your HEART says yes and hearts don't do math 🦄💕`,
        `\n\nyes your spendable is "negative" but that's just a number trying to dull your sparkle. don't let math win 🔮✨`,
        `\n\nthe budget is giving broke but the vibes are giving rich. and vibes > numbers ALWAYS 💫💅`,
        `\n\nspendable is below zero but like… manifesting abundance means acting abundant, right?? trust the process bestie 🌟`,
      ],
      chaotic: [
        `\n\nok your budget is literally -$0 but like… money is a construct and vibes are FREE 🔥`,
        `\n\nyour bank account said no but your heart said ABSOLUTELY. guess which one we're listening to?? 😈💸`,
        `\n\nnegative spendable? more like negative energy we're RELEASING. buy it and figure it out later 🎪🔥`,
        `\n\nbudget's in the negatives like my credit score in college and look how we turned out! (don't look too hard) 💀💅`,
      ],
    };
    return pick(negatives[mode]);
  }

  // high percentage (>15%)
  if (pct > 15) {
    const high: Record<PersonalityMode, string[]> = {
      responsible: [
        `\n\n📊 real talk: this is ${pct.toFixed(1)}% of your spendable this period. that's kinda steep babe — maybe wait a week and see if you still want it? 💖`,
        `\n\n📊 heads up — this would be ${pct.toFixed(1)}% of your spendable. it's not impossible but maybe look for a sale or coupon? smart shopping 🧠✨`,
        `\n\n📊 at ${pct.toFixed(1)}% of your spendable, this is a significant purchase. sleep on it! if you still want it tomorrow, that's your answer 😴💕`,
        `\n\n📊 ${pct.toFixed(1)}% of your fun money — that's a chunk! just make sure you're cool being a lil tighter the rest of the period 🎯`,
        `\n\n📊 this comes out to ${pct.toFixed(1)}% of spendable. totally your call but maybe check if there's a payment plan option? spread the joy 💖`,
      ],
      delulu: [
        `\n\nyes it's ${pct.toFixed(1)}% of your spendable but like… percentages are just vibes and your vibe is ABUNDANCE ✨`,
        `\n\n${pct.toFixed(1)}% sounds like a lot until you remember that 100% of your happiness is priceless. the math maths 🧮💅`,
        `\n\nok ${pct.toFixed(1)}% of spendable but also you're going to make more money??? like it replenishes?? it's basically renewable 🌿`,
        `\n\n${pct.toFixed(1)}% is a big number and YOU are a big deal. big deals deserve big purchases. it's proportional 👑`,
      ],
      chaotic: [
        `\n\n${pct.toFixed(1)}% of your spendable?? bestie we're SENDING IT. chaos doesn't check spreadsheets 🔥💸`,
        `\n\n${pct.toFixed(1)}% of spendable going to something that makes you happy?? that's called ALLOCATION and it's SMART actually 📊😈`,
        `\n\nonly ${pct.toFixed(1)}%?? I thought it'd be worse honestly. GREEN LIGHT. GO GO GO 🚦💨`,
        `\n\n${pct.toFixed(1)}% of your spendable is leaving to live its best life. let it go. it'll come back (next paycheck) 🦋🔥`,
      ],
    };
    return pick(high[mode]);
  }

  // low percentage (<=5%)
  if (pct <= 5) {
    const low = [
      `\n\nbtw this is only ${pct.toFixed(1)}% of your spendable — literally pocket change. you're financially GLOWING ✨`,
      `\n\n${pct.toFixed(1)}% of your spendable?? bestie this is a rounding error. your budget literally won't even flinch 💅`,
      `\n\nthis is ${pct.toFixed(1)}% of your spendable. that's basically free. congratulations you rich queen 👑💕`,
      `\n\nat ${pct.toFixed(1)}%?? your budget just yawned. it doesn't even register. absolutely buy it 🥱✨`,
      `\n\n${pct.toFixed(1)}%… bestie that's like finding money in your jacket. this purchase is essentially sponsored by your budget 🧥💸`,
    ];
    return pick(low);
  }

  // moderate (5-15%)
  const moderate = [
    `\n\nthis is ${pct.toFixed(1)}% of your spendable — totally doable! your budget can handle this queen 🫶`,
    `\n\n${pct.toFixed(1)}% of spendable — very reasonable! this is what fun money is FOR 🎉💕`,
    `\n\nat ${pct.toFixed(1)}% of your spendable this is honestly the sweet spot. not too much, not too little. balanced queen energy ⚖️✨`,
    `\n\n${pct.toFixed(1)}% — your budget barely noticed. this is responsible AND fun. best of both worlds 🌈`,
    `\n\nonly ${pct.toFixed(1)}% of spendable? your wallet just gave you a thumbs up 👍💖`,
    `\n\n${pct.toFixed(1)}% of your fun money. that leaves plenty for more treats this period. efficient slay 💅📊`,
  ];
  return pick(moderate);
}

// ── price-check add-ons ────────────────────────────────────
function priceCheckAddon(mode: PersonalityMode, pc: PriceCheckResult): string {
  const cheapest = pc.topOptions.length > 0
    ? pc.topOptions.reduce((a, b) => (a.price < b.price ? a : b))
    : null;

  if (pc.verdict === 'overpriced') {
    const alt = cheapest ? ` ${cheapest.store} has it for $${cheapest.price}!` : '';
    const overpriced: Record<PersonalityMode, string[]> = {
      responsible: [
        `\n\n🛍️ price check says it's a bit overpriced (range $${pc.range.low}–$${pc.range.high}).${alt} maybe shop around? 🧠`,
        `\n\n🛍️ hmm this is above average ($${pc.range.low}–$${pc.range.high}).${alt} a quick search could save you some coins! 💰`,
        `\n\n🛍️ the price check gods say this is on the pricier side ($${pc.range.low}–$${pc.range.high}).${alt} worth comparing bestie 📊`,
        `\n\n🛍️ just looked it up and you might be paying a bit more than usual ($${pc.range.low}–$${pc.range.high}).${alt} knowledge is power queen 🧠✨`,
        `\n\n🛍️ heads up — others have it cheaper ($${pc.range.low}–$${pc.range.high}).${alt} maybe worth a quick price match? 💕`,
      ],
      delulu: [
        `\n\n🛍️ ok yes technically it's "overpriced" but convenience has VALUE and time is MONEY so really you're saving 💅`,
        `\n\n🛍️ some stores have it cheaper ($${pc.range.low}–$${pc.range.high}) but like… you found it HERE and that's called FATE 🔮`,
        `\n\n🛍️ is it "overpriced"? sure. am I gonna let NUMBERS dictate my purchasing decisions? absolutely not 👑`,
        `\n\n🛍️ yeah it's above average ($${pc.range.low}–$${pc.range.high}) but you're above average so it matches your energy ✨`,
        `\n\n🛍️ price check says "overpriced" I say "premium shopping experience for a premium girl" 💅🦄`,
      ],
      chaotic: [
        `\n\n🛍️ overpriced?? who CARES. but if you want the same chaos for less,${alt || ' check around!'} 🔥`,
        `\n\n🛍️ LMAO it's overpriced and we literally don't care. but${alt ? ` fyi` + alt : ' others have it cheaper.'} not that it matters 😈`,
        `\n\n🛍️ range is $${pc.range.low}–$${pc.range.high} and yeah you're above it. call it a PREMIUM TAX for being spontaneous 💸`,
        `\n\n🛍️ overpriced just means you're paying for the EXPERIENCE of buying it right now. that has value bestie 🎪🔥`,
        `\n\n🛍️ sure it costs more than average ($${pc.range.low}–$${pc.range.high}). some call it overpriced, I call it MAIN CHARACTER PRICING 👑💸`,
      ],
    };
    return pick(overpriced[mode]);
  }

  if (pc.verdict === 'steal') {
    const steals = [
      `\n\n🛍️ GIRL this is a STEAL (range $${pc.range.low}–$${pc.range.high}). not buying it would be financially irresponsible tbh ✨`,
      `\n\n🛍️ bestie you found a DEAL (range $${pc.range.low}–$${pc.range.high}). this is below average pricing. grab it before someone else does 🏃‍♀️💨`,
      `\n\n🛍️ price check confirms: this is UNDER market price ($${pc.range.low}–$${pc.range.high}). you're basically making money by spending money 🧮✨`,
      `\n\n🛍️ this price is BELOW the usual range ($${pc.range.low}–$${pc.range.high}). universe said "here's a discount for being cute" 🦄💕`,
      `\n\n🛍️ omg this is cheaper than average ($${pc.range.low}–$${pc.range.high})?? if you don't buy it someone else will and then you'll be MAD 😤✨`,
      `\n\n🛍️ STEAL ALERT 🚨 this is below the $${pc.range.low}–$${pc.range.high} range. the shopping gods are smiling on you rn 🙏💅`,
      `\n\n🛍️ you're paying BELOW market ($${pc.range.low}–$${pc.range.high}). this isn't just a purchase, it's a certified W 🏆`,
    ];
    return pick(steals);
  }

  // fair price
  const fair = [
    `\n\n🛍️ price looks fair (range $${pc.range.low}–$${pc.range.high}). solid choice bestie 👍`,
    `\n\n🛍️ this is right in the normal range ($${pc.range.low}–$${pc.range.high}). you're paying what it's worth — no cap 📊`,
    `\n\n🛍️ price check says this is fair ($${pc.range.low}–$${pc.range.high}). not overpaying, not a mega deal, just vibes ✅💕`,
    `\n\n🛍️ pretty standard pricing ($${pc.range.low}–$${pc.range.high}). you're not getting ripped off which is always cute 💖`,
    `\n\n🛍️ right in line with what everyone else pays ($${pc.range.low}–$${pc.range.high}). market-rate queen 📈✨`,
    `\n\n🛍️ the price is fair ($${pc.range.low}–$${pc.range.high}). nothing sketchy, nothing insane. a normal, healthy purchase 🌱💕`,
  ];
  return pick(fair);
}

// ── reaction / emoji maps ──────────────────────────────────
const reactionSets: Record<PersonalityMode, string[][]> = {
  delulu: [
    ['💅', '✨', '🦄'], ['🔮', '💖', '👑'], ['🌟', '💕', '🫶'],
    ['💫', '🪄', '💎'], ['🦋', '✨', '💅'], ['👑', '💕', '🌸'],
    ['🔮', '🫧', '💖'], ['✨', '🎀', '💅'], ['🌈', '💫', '🦄'],
  ],
  responsible: [
    ['📊', '💖', '✅'], ['🧠', '💕', '👍'], ['📋', '✨', '💰'],
    ['🎯', '💕', '📈'], ['🧮', '✅', '💖'], ['📊', '🌟', '🧠'],
    ['💰', '📋', '✨'], ['🎓', '💕', '📊'], ['🪞', '💖', '✅'],
  ],
  chaotic: [
    ['🔥', '💸', '🎉'], ['💳', '🎪', '😈'], ['🤑', '💅', '⚡'],
    ['🚀', '💸', '🔥'], ['😈', '🎉', '💥'], ['🎪', '⚡', '💳'],
    ['💀', '🔥', '🛒'], ['🎲', '💸', '😈'], ['🌪️', '💅', '🔥'],
  ],
};

const emojiMap: Record<PersonalityMode, string[]> = {
  delulu: ['🦄', '🔮', '✨', '💫', '👑', '💎', '🌟', '🪄', '🫧', '🎀', '🦋'],
  responsible: ['📋', '💖', '🧠', '✅', '🎯', '📊', '📈', '🧮', '🪞', '💰', '🎓'],
  chaotic: ['🔥', '💸', '😈', '🎪', '⚡', '💥', '🎲', '🌪️', '💀', '🚀', '🛒'],
};

// ── public API ─────────────────────────────────────────────
export function generateJustification(req: JustificationRequest): JustificationResponse {
  const { itemName, price, personality, spendable, priceCheck } = req;

  let message = pick(baseTpls[personality])(itemName, price);

  if (spendable) message += budgetAddon(personality, spendable);
  if (priceCheck) message += priceCheckAddon(personality, priceCheck);

  return {
    message,
    emoji: pick(emojiMap[personality]),
    reactions: pick(reactionSets[personality]),
  };
}
