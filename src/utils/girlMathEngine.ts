import {
  JustificationRequest,
  JustificationResponse,
  PersonalityMode,
  SpendableResult,
  SmartJustificationContext,
} from '../types';

// ── helpers ────────────────────────────────────────────────
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
type ContentLocale = 'en' | 'es' | 'th';
const contentLocale = (locale?: string): ContentLocale => {
  const lang = locale?.toLowerCase();
  if (lang?.startsWith('th')) return 'th';
  if (lang?.startsWith('es')) return 'es';
  return 'en';
};

const thCategoryLabel = (cat: string): string => ({
  shopping: 'ช้อปปิ้ง',
  food: 'ของกิน',
  beauty: 'บิวตี้',
  shoes: 'รองเท้า',
  health: 'สุขภาพ',
  tech: 'แกดเจ็ต',
  fun: 'ความสนุก',
  home: 'ของเข้าบ้าน',
  misc: 'อื่นๆ',
}[cat] ?? cat);

const esCategoryLabel = (cat: string): string => ({
  shopping: 'compras',
  food: 'comida',
  beauty: 'belleza',
  shoes: 'zapatos',
  health: 'salud',
  tech: 'tecnología',
  fun: 'diversión',
  home: 'hogar',
  misc: 'varios',
}[cat] ?? cat);

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

const thBaseTpls: Record<PersonalityMode, Array<(i: string, p: number) => string>> = {
  delulu: [
    (i, p) => `แก ${i} ราคา $${p} นี่ไม่ใช่รายจ่ายนะ นี่คือการลงทุนกับเวอร์ชันที่แฮปปี้ขึ้นของตัวเอง 💅 ใช้บ่อยๆ หารแล้วเหลือนิดเดียวเอง`,
    (i, p) => `${i} มาอยู่ตรงหน้าแล้ว แปลว่าจังหวะชีวิตจัดมาให้แล้วอะ $${p} คือค่าความสุขแบบมีใบเสร็จ ✨`,
    (i, p) => `ถ้าไม่เอา ${i} ตอนนี้ เดี๋ยวกลับบ้านไปคิดถึงอีกหลายวันนะ พื้นที่ในหัวก็มีราคานะคะ $${p} ซื้อความสบายใจไปเลย`,
    (i, p) => `${i} ราคา $${p}? ถ้าหารตามจำนวนครั้งที่จะใช้ มันแทบจะเป็นเศษเงินแล้ว ของมันต้องมี 🧮`,
    (i, p) => `เอาจริง $${p} สำหรับ ${i} คือค่าคอมพลิเมนต์ล่วงหน้า คนต้องทักแน่ และความมั่นใจประเมินค่าไม่ได้ 👑`,
    (i, p) => `${i} ไม่ได้แพง มันแค่เลือกเจ้าของที่คู่ควร แล้วเจ้าของก็คือแกไง $${p} จบ กดเลย 💖`,
    (i, p) => `วันนี้ $${p} อาจดูเป็นเงิน แต่พรุ่งนี้มันจะกลายเป็นความสุขเวลาได้ใช้ ${i} นี่แหละคณิตศาสตร์สายใจฟู 📈`,
    (i, p) => `ถ้า ${i} หมดก่อน แกจะเสียใจมากกว่าเสีย $${p} แน่นอน ซื้อความไม่เสียดายไว้ก่อน ฉลาดสุดๆ`,
  ],
  responsible: [
    (i, p) => `${i} ราคา $${p} โอเค มาดูแบบเพื่อนเตือนเพื่อน: บิลจ่ายแล้ว เงินกินอยู่โอเค ถ้าใช่ก็ซื้อได้แบบไม่ต้องรู้สึกผิด 💖`,
    (i, p) => `อยากได้ ${i} เข้าใจเลย $${p} ถ้าอยู่ในงบสนุกของเดือนนี้ ก็ถือว่าเป็นการใช้เงินที่ตั้งใจ ไม่ใช่หลุดมือ 📊`,
    (i, p) => `${i} ที่ $${p} ถามตัวเองนิดนึงว่ายังอยากได้อยู่ไหมถ้ารอถึงพรุ่งนี้ ถ้าคำตอบยังใช่ ไฟเขียวแบบมีสติ ✅`,
    (i, p) => `ดีแล้วที่เช็กก่อนซื้อ ${i} ราคา $${p} ถ้าเทียบราคาแล้วนี่ดีสุด ก็เป็นดีลที่รับได้เลย`,
    (i, p) => `${i} ราคา $${p} ถ้ามันแทนของเดิมที่ใช้จริง หรือทำให้ชีวิตสะดวกขึ้น อันนี้จัดว่าเป็นอัปเกรดที่มีเหตุผลนะ`,
    (i, p) => `$${p} สำหรับ ${i} ไม่ได้น่ากลัว ถ้าไม่ได้เบียดเงินสำคัญ แค่ล็อกงบที่เหลือไว้หน่อย จะได้ซื้อแล้วสบายใจ`,
    (i, p) => `ถ้า ${i} เป็นของที่ใช้ประจำ $${p} จะคุ้มขึ้นทุกครั้งที่หยิบมาใช้ แต่ถ้าซื้อเพราะโมเมนต์เฉยๆ ลองพักไว้ก่อนก็ได้`,
    (i, p) => `ชอบ ${i} ให้แกนะ $${p} ถือว่าเป็นรางวัลได้ แค่ไม่ให้รางวัลชิ้นเดียวลากไปเป็นทั้งตะกร้าก็พอ 🎯`,
  ],
  chaotic: [
    (i, p) => `$${p} สำหรับ ${i}? แก เราใส่ตะกร้าทางใจไปแล้วตั้งแต่เห็นรูป 🛒💅`,
    (i, p) => `สมองบอกให้คิดก่อน แต่หัวใจพิมพ์เลขบัตรไปแล้ว ${i} ราคา $${p} จังหวะนี้ต้องไปต่อ 🔥`,
    (i, p) => `${i} ที่ $${p} คือพล็อตสำคัญของชีวิตช่วงนี้ อย่าขัดบทตัวเองค่ะ 🎬`,
    (i, p) => `เหตุผลที่ควรซื้อ ${i}: หนึ่ง อยากได้ สอง ราคา $${p} สาม เราเหนื่อยมาทั้งอาทิตย์ จบการนำเสนอ 💸`,
    (i, p) => `บัญชีอาจมีคำถาม แต่เราไม่มีเวลาตอบ ${i} ราคา $${p} และใจมันเลือกแล้ว 😈`,
    (i, p) => `${i} ราคา $${p} นี่ไม่ใช่อิมพัลส์นะ แค่ตัดสินใจเร็วเพราะรู้ใจตัวเองมากพอ 💳`,
    (i, p) => `บางคนฮีลใจด้วยการนอน เราฮีลใจด้วย ${i} ราคา $${p} ทุกคนมีวิธีของตัวเอง 🫠`,
    (i, p) => `ข้อดี: ได้ ${i}\nข้อเสีย: จ่าย $${p}\nสรุป: ข้อดีชนะ เพราะน่ารักกว่า 💅`,
  ],
};

const esBaseTpls: Record<PersonalityMode, Array<(i: string, p: number) => string>> = {
  delulu: [
    (i, p) => `amiga, $${p} por ${i} no es un gasto: es una inversión en tu versión más feliz 💅 si lo usas varias veces, el costo por uso queda chiquitito`,
    (i, p) => `${i} apareció en tu camino por algo. $${p} es básicamente la cuota de manifestar una vida más bonita ✨`,
    (i, p) => `si no compras ${i}, vas a pensar en eso toda la semana. Esa paz mental vale más que $${p}, la verdad`,
    (i, p) => `${i} por $${p}? Si lo divides entre todos los días que lo vas a amar, prácticamente no cuenta 🧮`,
    (i, p) => `$${p} por ${i} también compra cumplidos, confianza y cero arrepentimiento. Eso no cabe en una hoja de cálculo 👑`,
    (i, p) => `${i} no está caro, solo está esperando a la dueña correcta. Spoiler: eres tú. $${p} y se cierra el caso 💖`,
    (i, p) => `hoy son $${p}, mañana es felicidad cada vez que uses ${i}. Matemáticas emocionales, pero matemáticas al fin 📈`,
    (i, p) => `si ${i} se agota, el arrepentimiento te va a salir más caro que $${p}. Comprar tranquilidad también es válido`,
  ],
  responsible: [
    (i, p) => `${i} por $${p}: hagamos revisión rápida. ¿Pagos cubiertos, comida cubierta y todavía cabe en tu presupuesto? Entonces puede ser un gusto sin culpa 💖`,
    (i, p) => `entiendo que quieras ${i}. $${p} está bien si sale de tu dinero para gustos, no del dinero de pagos importantes 📊`,
    (i, p) => `${i} a $${p}: si mañana sigues queriéndolo igual, eso ya suena a compra pensada, no impulso ✅`,
    (i, p) => `bien por revisar antes de comprar. Si ${i} por $${p} es el mejor precio que encontraste, se vale considerarlo`,
    (i, p) => `${i} por $${p}: si reemplaza algo que ya usas o te hace la vida más fácil, eso cuenta como upgrade con sentido`,
    (i, p) => `$${p} por ${i} no tiene que dar culpa si no mueve tus prioridades. Solo ponle límite al resto de la semana y disfrútalo`,
    (i, p) => `si vas a usar ${i} seguido, $${p} se vuelve más razonable cada vez. Si es puro antojo de momento, quizá duerme la decisión`,
    (i, p) => `me gusta ${i} para ti. $${p} puede ser un gusto válido; solo que un gusto no se convierta en carrito completo 🎯`,
  ],
  chaotic: [
    (i, p) => `$${p} por ${i}? Mentalmente ya está en el carrito, no sé qué estamos debatiendo 🛒💅`,
    (i, p) => `mi cerebro dijo "piénsalo", pero mi corazón ya estaba pagando. ${i}, $${p}, siguiente pregunta 🔥`,
    (i, p) => `${i} a $${p} es parte importante de la trama de esta temporada. No arruinemos el guion 🎬`,
    (i, p) => `razones para comprar ${i}: uno, lo quieres. dos, cuesta $${p}. tres, has sobrevivido demasiado esta semana. Fin 💸`,
    (i, p) => `tu cuenta puede tener preguntas, pero hoy no estamos en horario de atención. ${i} por $${p} y seguimos 😈`,
    (i, p) => `${i} por $${p} no es impulso, es rapidez ejecutiva con buena intuición 💳`,
    (i, p) => `hay gente que se regula tomando agua. Tú te regulas con ${i} por $${p}. Cada quien sus métodos 🫠`,
    (i, p) => `pro: ${i}\ncontra: $${p}\nconclusión: ganó el pro porque se veía más bonito 💅`,
  ],
};

// ── budget-aware add-ons ───────────────────────────────────
function budgetAddonTh(mode: PersonalityMode, s: SpendableResult): string {
  const pct = typeof s.purchasePct === 'number' && isFinite(s.purchasePct) ? s.purchasePct : 999;

  if (s.perPeriod <= 0) {
    const negatives: Record<PersonalityMode, string[]> = {
      responsible: [
        `\n\n⚠️ เตือนแบบรักนะ งบใช้จ่ายรอบนี้ติดลบแล้ว รอเงินเข้ารอบหน้าจะสบายใจกว่า`,
        `\n\n⚠️ ตัวเลขบอกว่ารอบนี้แน่นแล้วอะ เก็บไว้ใน wishlist ก่อน พอเงินเข้าแล้วค่อยฉลองแบบไม่เครียด 💕`,
      ],
      delulu: [
        `\n\nงบบอกว่าไม่ แต่ใจบอกว่าใช่ และใจไม่เคยเปิดชีตคำนวณค่ะ ✨`,
        `\n\nตัวเลขติดลบก็จริง แต่ฟีลตอนใช้ของใหม่เป็นบวกมากนะ คิดแบบนี้ก่อน 🔮`,
      ],
      chaotic: [
        `\n\nงบติดลบแต่ใจเต็มร้อยมาก แรงต้านจากบัญชีชั่วคราวเท่านั้น 🔥`,
        `\n\nเงินในงบอาจบอกพักก่อน แต่พลังการช้อปบอกว่าเรื่องนี้ต้องมีภาคต่อ 💸`,
      ],
    };
    return pick(negatives[mode]);
  }

  if (pct > 15) {
    const high: Record<PersonalityMode, string[]> = {
      responsible: [
        `\n\n📊 อันนี้ประมาณ ${pct.toFixed(1)}% ของเงินใช้จ่ายรอบนี้ แอบก้อนใหญ่ ลองรอหนึ่งคืนหรือหาดีลก่อนจะชัวร์กว่า`,
        `\n\n📊 ${pct.toFixed(1)}% ของงบใช้จ่ายนะ ซื้อได้ถ้าตั้งใจจริง แต่เดือนนี้อาจต้องคุมอย่างอื่นนิดนึง`,
      ],
      delulu: [
        `\n\n${pct.toFixed(1)}% อาจดูเยอะ แต่ความสุข 100% ก็มีน้ำหนักเหมือนกันนะคะ 🧮`,
        `\n\nใช่ มันคือ ${pct.toFixed(1)}% ของงบ แต่เงินเข้าใหม่ได้ ฟีลดีๆ แบบนี้ไม่ได้เจอบ่อย ✨`,
      ],
      chaotic: [
        `\n\n${pct.toFixed(1)}% ของงบใช้จ่าย? โอเค นี่คือการจัดสรรงบให้ความสุขแบบจริงจัง 🔥`,
        `\n\nตัวเลข ${pct.toFixed(1)}% ดูแรง แต่ใจเราแรงกว่า ไปค่ะ 🚦`,
      ],
    };
    return pick(high[mode]);
  }

  if (pct <= 5) {
    return pick([
      `\n\nแค่ ${pct.toFixed(1)}% ของเงินใช้จ่ายเอง งบแทบไม่รู้สึกตัวด้วยซ้ำ ✨`,
      `\n\n${pct.toFixed(1)}% ของงบใช้จ่าย อันนี้เรียกว่าขยับเบาๆ ไม่ใช่ช้อปหนัก 💅`,
      `\n\nตัวเลขคือ ${pct.toFixed(1)}% เท่านั้น ซื้อแล้วงบยังยิ้มอยู่ค่ะ`,
    ]);
  }

  return pick([
    `\n\nประมาณ ${pct.toFixed(1)}% ของเงินใช้จ่ายรอบนี้ ถือว่าอยู่โซนพอดี ซื้อได้ถ้าตั้งใจจริง 💖`,
    `\n\n${pct.toFixed(1)}% ของงบใช้จ่าย ไม่เบาแต่ไม่แรง จัดเป็นความสุขที่ยังคุมได้`,
    `\n\nตัวเลข ${pct.toFixed(1)}% ยังรับไหว เหลืองบให้ชีวิตหลังจากนี้อยู่ค่ะ 📊`,
  ]);
}

function budgetAddon(mode: PersonalityMode, s: SpendableResult, locale: ContentLocale = 'en'): string {
  if (locale === 'th') return budgetAddonTh(mode, s);
  if (locale === 'es') {
    const pct = typeof s.purchasePct === 'number' && isFinite(s.purchasePct) ? s.purchasePct : 999;

    if (s.perPeriod <= 0) {
      const negatives: Record<PersonalityMode, string[]> = {
        responsible: [
          `\n\n⚠️ aviso con cariño: tu disponible está en negativo este período. Mejor espera al siguiente pago para comprar sin estrés`,
          `\n\n⚠️ los números dicen que este período ya está apretado. Guárdalo en wishlist y vuelve cuando entre dinero 💕`,
        ],
        delulu: [
          `\n\nel presupuesto dice que no, pero el corazón dice que sí, y el corazón no abre hojas de cálculo ✨`,
          `\n\nsí, el disponible está negativo, pero la felicidad de usarlo sería bastante positiva 🔮`,
        ],
        chaotic: [
          `\n\nel presupuesto está en negativo, pero las ganas están al 100. Energías encontradas 🔥`,
          `\n\nla cuenta pidió pausa, pero la trama pidió continuación 💸`,
        ],
      };
      return pick(negatives[mode]);
    }

    if (pct > 15) {
      const high: Record<PersonalityMode, string[]> = {
        responsible: [
          `\n\n📊 esto es ${pct.toFixed(1)}% de tu disponible del período. Es una compra grande; dormirlo una noche o buscar descuento sería buena idea`,
          `\n\n📊 ${pct.toFixed(1)}% de tu disponible. Se puede si de verdad lo quieres, pero el resto del período tendría que ir más controlado`,
        ],
        delulu: [
          `\n\n${pct.toFixed(1)}% suena mucho, pero 100% de felicidad también cuenta en la ecuación 🧮`,
          `\n\nsí, es ${pct.toFixed(1)}% del disponible, pero el dinero vuelve y esta oportunidad quizá no ✨`,
        ],
        chaotic: [
          `\n\n${pct.toFixed(1)}% del disponible yendo directo a la felicidad. Eso se llama asignación de recursos 🔥`,
          `\n\n${pct.toFixed(1)}% se ve intenso, pero tus ganas vienen más intensas. Luz verde emocional 🚦`,
        ],
      };
      return pick(high[mode]);
    }

    if (pct <= 5) {
      return pick([
        `\n\nes solo ${pct.toFixed(1)}% de tu disponible. Tu presupuesto casi ni se entera ✨`,
        `\n\n${pct.toFixed(1)}% del disponible: eso es un gustito, no una crisis 💅`,
        `\n\ncon ${pct.toFixed(1)}%, el presupuesto sigue respirando tranquilo`,
      ]);
    }

    return pick([
      `\n\nes ${pct.toFixed(1)}% de tu disponible del período. Está en zona razonable si es una compra intencional 💖`,
      `\n\n${pct.toFixed(1)}% del disponible: no es nada, pero tampoco rompe el plan. Se puede manejar`,
      `\n\n${pct.toFixed(1)}% todavía deja espacio para vivir el resto del período con calma 📊`,
    ]);
  }

  // Guard against NaN/Infinity from edge-case computeSpendable results
  const pct = typeof s.purchasePct === 'number' && isFinite(s.purchasePct) ? s.purchasePct : 999;

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
// ── smart personalization addon ───────────────────────────
// Picks the single most relevant real-user-data fact and weaves it in naturally.
// This is what makes responses feel like actual AI — because it knows YOUR numbers.
function smartAddonTh(mode: PersonalityMode, ctx: SmartJustificationContext): string {
  const candidates: string[] = [];

  if (ctx.savingsJarTotal && ctx.savingsJarTotal >= 10) {
    const j = Math.round(ctx.savingsJarTotal);
    candidates.push(...({
      delulu: [`ในกระปุกมี $${j} จากของที่เคยข้ามมา นี่เหมือนตั้งกองทุนไว้เพื่อโมเมนต์นี้แล้ว 🫙`],
      responsible: [`กระปุกออมมี $${j} จากการข้ามซื้อของก่อนหน้า ถ้าจะใช้บางส่วนกับของที่อยากได้จริงๆ ก็สมเหตุสมผลนะ ✅`],
      chaotic: [`กระปุกมี $${j} นอนรอภารกิจอยู่ และภารกิจวันนี้ดูเหมือนจะชัดมาก 🫙🔥`],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  if (ctx.daysSinceLastSplurge !== undefined && ctx.daysSinceLastSplurge >= 3) {
    const d = ctx.daysSinceLastSplurge;
    candidates.push(...({
      delulu: [`ไม่ได้เปย์หนักมา ${d} วันแล้ว ถือว่าอดทนมาพอสมควร จักรวาลควรเห็นใจ ✨`],
      responsible: [`ไม่ได้ซื้อหนักมา ${d} วัน วินัยดีมาก ถ้าจะให้รางวัลตัวเองแบบพอดีๆ ก็โอเค 💖`],
      chaotic: [`${d} วันไม่มีช้อปหนัก? สถิติสวยแล้ว ปิดจ็อบได้ 🔥`],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  if (ctx.treatBudgetRemaining && ctx.treatBudgetRemaining >= 5) {
    const t = Math.round(ctx.treatBudgetRemaining);
    candidates.push(...({
      delulu: [`งบให้รางวัลตัวเองยังเหลือ $${t} เงินก้อนนี้เกิดมาเพื่อความสุขแบบนี้แหละ 🎀`],
      responsible: [`งบให้รางวัลตัวเองเหลือ $${t} ถ้าใช้จากซองนี้ก็ตรงวัตถุประสงค์เลย 🎯`],
      chaotic: [`งบ treat เหลือ $${t} แล้วจะปล่อยให้นิ่งเฉยได้ไง 💅`],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  if (ctx.topCategory && ctx.topCategoryAmount && ctx.topCategoryAmount > 0) {
    const cat = thCategoryLabel(ctx.topCategory);
    const amt = Math.round(ctx.topCategoryAmount);
    candidates.push(...({
      delulu: [`รอบนี้หมวด ${cat} ขึ้นนำที่ $${amt} แล้ว แปลว่ารสนิยมชัดมากและเรารับทราบ 👑`],
      responsible: [`หมวดที่ใช้เยอะสุดรอบนี้คือ ${cat} ที่ $${amt} เก็บไว้เป็นบริบทก่อนตัดสินใจก็ดี 📊`],
      chaotic: [`${cat} นำอยู่ที่ $${amt} แล้ว ไปให้สุดทางฟีลก็ได้มั้ง 🔥`],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  if (ctx.auraScore !== undefined && ctx.auraScore >= 400) {
    const s = ctx.auraScore;
    const vibe = s >= 800 ? 'ออร่าพุ่ง' : s >= 600 ? 'กำลังฟื้นตัวสวยๆ' : 'บาลานซ์อยู่';
    candidates.push(...({
      delulu: [`คะแนนออร่า ${s}/1000 ตอนนี้คือ${vibe} คนฟีลดีสมควรมีของดีๆ นะ ✨`],
      responsible: [`ออร่า ${s}/1000 ถือว่า${vibe} ถ้าซื้อแบบมีแผนก็ยังรักษาทรงได้ ✅`],
      chaotic: [`ออร่า ${s}/1000 คะแนนก็ช่วยเชียร์อยู่นะ จังหวะนี้มีน้ำหนัก 💸`],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  if (ctx.weekTotal !== undefined && ctx.weekTotal >= 0 && ctx.weekTotal < 50) {
    const w = Math.round(ctx.weekTotal);
    candidates.push(...({
      delulu: [`ทั้งสัปดาห์ใช้ไปแค่ $${w} เอง กระเป๋าตังค์ได้พักมาแล้ว ให้เขามีโมเมนต์บ้าง 💅`],
      responsible: [`สัปดาห์นี้ใช้ไป $${w} ยังอยู่ในโซนคุมได้ มีพื้นที่ให้การซื้อที่ตั้งใจอยู่ค่ะ 📊`],
      chaotic: [`วีคนี้เพิ่ง $${w}? ทางยังโล่งมาก ไปต่อได้แบบมีไฟ 🔥`],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  if (candidates.length === 0) return '';
  return `\n\nอีกอย่างนะ: ${pick(candidates)}`;
}

function smartAddon(mode: PersonalityMode, ctx: SmartJustificationContext, locale: ContentLocale = 'en'): string {
  if (locale === 'th') return smartAddonTh(mode, ctx);
  if (locale === 'es') {
    const candidates: string[] = [];

    if (ctx.savingsJarTotal && ctx.savingsJarTotal >= 10) {
      const j = Math.round(ctx.savingsJarTotal);
      candidates.push(...({
        delulu: [`tu alcancía tiene $${j} de compras que evitaste. Eso suena como fondo oficial para este momento 🫙`],
        responsible: [`tienes $${j} en la alcancía por compras evitadas. Usar una parte en algo que sí quieres puede tener sentido ✅`],
        chaotic: [`hay $${j} en la alcancía esperando misión, y esta misión se ve clarísima 🫙🔥`],
      } as Record<PersonalityMode, string[]>)[mode]);
    }

    if (ctx.daysSinceLastSplurge !== undefined && ctx.daysSinceLastSplurge >= 3) {
      const d = ctx.daysSinceLastSplurge;
      candidates.push(...({
        delulu: [`llevas ${d} días sin un gasto fuerte. Esa disciplina merece reconocimiento ✨`],
        responsible: [`${d} días sin un derroche grande: buen autocontrol. Un gusto medido puede entrar 💖`],
        chaotic: [`${d} días sin caos de compras. La racha ya cumplió su propósito 🔥`],
      } as Record<PersonalityMode, string[]>)[mode]);
    }

    if (ctx.treatBudgetRemaining && ctx.treatBudgetRemaining >= 5) {
      const t = Math.round(ctx.treatBudgetRemaining);
      candidates.push(...({
        delulu: [`te quedan $${t} en tu presupuesto de gustos. Ese dinero nació para momentos así 🎀`],
        responsible: [`quedan $${t} en tu presupuesto de gustos; si sale de ahí, está justo para eso 🎯`],
        chaotic: [`$${t} de dinero para gustos sin usar. Eso no puede quedarse aburrido 💅`],
      } as Record<PersonalityMode, string[]>)[mode]);
    }

    if (ctx.topCategory && ctx.topCategoryAmount && ctx.topCategoryAmount > 0) {
      const cat = esCategoryLabel(ctx.topCategory);
      const amt = Math.round(ctx.topCategoryAmount);
      candidates.push(...({
        delulu: [`tu categoría más fuerte este período es ${cat} con $${amt}. Tienes un estilo claro y se respeta 👑`],
        responsible: [`tu categoría principal este período es ${cat} con $${amt}. Vale la pena tenerlo presente antes de decidir 📊`],
        chaotic: [`${cat} va ganando con $${amt}. La consistencia también es una personalidad 🔥`],
      } as Record<PersonalityMode, string[]>)[mode]);
    }

    if (ctx.auraScore !== undefined && ctx.auraScore >= 400) {
      const s = ctx.auraScore;
      const vibe = s >= 800 ? 'brillando' : s >= 600 ? 'recuperándose bonito' : 'en equilibrio';
      candidates.push(...({
        delulu: [`tu aura está en ${s}/1000, o sea ${vibe}. La gente con buena energía merece cosas lindas ✨`],
        responsible: [`aura ${s}/1000: vas ${vibe}. Una compra planeada puede mantener ese ritmo ✅`],
        chaotic: [`${s}/1000 de aura. El marcador está apoyando la compra, honestamente 💸`],
      } as Record<PersonalityMode, string[]>)[mode]);
    }

    if (ctx.weekTotal !== undefined && ctx.weekTotal >= 0 && ctx.weekTotal < 50) {
      const w = Math.round(ctx.weekTotal);
      candidates.push(...({
        delulu: [`solo $${w} gastados esta semana. Tu cartera descansó; puede tener un momentito 💅`],
        responsible: [`esta semana llevas $${w}. Vas bastante controlada, así que hay margen para una compra intencional 📊`],
        chaotic: [`¿solo $${w} esta semana? Hay pista libre para avanzar 🔥`],
      } as Record<PersonalityMode, string[]>)[mode]);
    }

    if (candidates.length === 0) return '';
    return `\n\nademás: ${pick(candidates)}`;
  }

  const candidates: string[] = [];

  // savings jar — user has skipped purchases to save money
  if (ctx.savingsJarTotal && ctx.savingsJarTotal >= 10) {
    const j = Math.round(ctx.savingsJarTotal);
    candidates.push(...({
      delulu: [
        `you've saved $${j} by skipping other things — that's a fund specifically for THIS moment 🫙✨`,
        `your savings jar has $${j} in it from pure discipline. you pre-paid for this queen 🫙💅`,
      ],
      responsible: [
        `btw you've saved $${j} in your jar by skipping other purchases 🫙 this is exactly what that's for ✅`,
        `your discipline jar: $${j} — using some here is the whole point of saving 💖📊`,
      ],
      chaotic: [
        `$${j} in your savings jar just SITTING THERE screaming to be deployed 🫙💸 answer the call`,
        `your jar has $${j} and it's bored. this is the mission. SEND IT 🔥`,
      ],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  // days since last splurge — reward the restraint
  if (ctx.daysSinceLastSplurge !== undefined && ctx.daysSinceLastSplurge >= 3) {
    const d = ctx.daysSinceLastSplurge;
    candidates.push(...({
      delulu: [
        `${d} days since your last splurge?? you've been financially FASTING bestie, this is earned 👑`,
        `${d} days of restraint??? the universe literally owes you this 🔮`,
      ],
      responsible: [
        `you haven't splurged in ${d} days — great discipline! you've earned a mindful treat 💖`,
        `${d} days without a splurge = you've built up credit with yourself. cash it in ✅📊`,
      ],
      chaotic: [
        `${d} days clean from chaos?? the streak ends NOW and it ends GLORIOUSLY 🔥💸`,
        `${d} days without spending?? we need to fix this immediately 💅🌪️`,
      ],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  // treat budget remaining — this is literally what fun money is for
  if (ctx.treatBudgetRemaining && ctx.treatBudgetRemaining >= 5) {
    const t = Math.round(ctx.treatBudgetRemaining);
    candidates.push(...({
      delulu: [
        `your treat budget has $${t} left just BEGGING to fulfill its destiny 🎀✨`,
        `$${t} in fun money literally exists for this exact situation bestie 💕`,
      ],
      responsible: [
        `you've got $${t} left in your treat budget this period — this is exactly what it's for 🎯💖`,
        `treat budget check: $${t} available. completely valid use ✅`,
      ],
      chaotic: [
        `$${t} in treat budget = $${t} in OBLIGATION TO SLAY 💅 you basically have to`,
        `$${t} of treat money collecting dust?? not on my watch 🔥💸`,
      ],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  // top category this period — they have a taste and it's consistent
  if (ctx.topCategory && ctx.topCategoryAmount && ctx.topCategoryAmount > 0) {
    const cat = ctx.topCategory;
    const amt = Math.round(ctx.topCategoryAmount);
    candidates.push(...({
      delulu: [
        `${cat} is literally your top category at $${amt} this period — you have TASTE and I respect it 👑`,
        `$${amt} on ${cat} already? you're committed to the aesthetic and I love that 💅`,
      ],
      responsible: [
        `your top category is ${cat} at $${amt} this period — just staying aware as you decide 📊`,
        `${cat} is where most of your money goes ($${amt}) — worth factoring in 🧠`,
      ],
      chaotic: [
        `already top ${cat} spender at $${amt}?? CONSISTENT QUEEN. keep the throne 🔥`,
        `${cat} leader, $${amt} deep, and STILL going?? we love to see it 💸👑`,
      ],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  // aura score context — high score = earned it, low score = needs help
  if (ctx.auraScore !== undefined && ctx.auraScore >= 400) {
    const s = ctx.auraScore;
    const vibe = s >= 800 ? 'glowing era' : s >= 600 ? 'healing era' : 'balanced era';
    candidates.push(...({
      delulu: [
        `your aura is at ${s}/1000 right now (${vibe}) — queens in their ${vibe} deserve nice things 👑✨`,
        `${s} aura points means you're thriving and thriving girlies invest in themselves 🌟`,
      ],
      responsible: [
        `aura check: ${s}/1000 — ${vibe} energy. stay consistent and it keeps climbing 📈💖`,
        `with ${s} aura points you're clearly making smart moves. this can be one of them ✅`,
      ],
      chaotic: [
        `${s} aura points?? she's BUILT different. the score justifies it 🔥💅`,
        `${vibe} with ${s} points — absolute power move to buy this right now 💸✨`,
      ],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  // low week total — they've been good, they have room
  if (ctx.weekTotal !== undefined && ctx.weekTotal >= 0 && ctx.weekTotal < 50) {
    const w = Math.round(ctx.weekTotal);
    candidates.push(...({
      delulu: [
        `only $${w} spent this whole week?? your wallet has been RESTING, time to wake her up 💅✨`,
        `$${w} total this week so far — she's been quiet. give her something to celebrate 🎉`,
      ],
      responsible: [
        `you've only spent $${w} this week — well within range. this fits the budget 📊💕`,
        `$${w} week total? very much in check. room for this 100% ✅`,
      ],
      chaotic: [
        `$${w} this week?? barely a dent!! GO OFF bestie there's so much runway 🔥💸`,
        `only $${w} so far this week. we have budget to BURN 😈💅`,
      ],
    } as Record<PersonalityMode, string[]>)[mode]);
  }

  if (candidates.length === 0) return '';
  return `\n\nalso: ${pick(candidates)}`;
}

export function generateJustification(req: JustificationRequest): JustificationResponse {
  const { itemName, price, personality, spendable, smartCtx } = req;
  const locale = contentLocale(req.locale);

  const templates = locale === 'th' ? thBaseTpls : locale === 'es' ? esBaseTpls : baseTpls;
  let message = pick(templates[personality])(itemName, price);

  if (spendable) message += budgetAddon(personality, spendable, locale);
  if (smartCtx) message += smartAddon(personality, smartCtx, locale);

  return {
    message,
    emoji: pick(emojiMap[personality]),
    reactions: pick(reactionSets[personality]),
  };
}

// ── Girl Math Moments ──────────────────────────────────────
const GIRL_MATH_MOMENTS = [
  "if you return something, that's free money. spending that free money is literally saving",
  "buying the expensive version means you won't need to replace it — it actually saves money",
  "if you split the cost over every day you'll own it, it's basically free",
  "if it's on sale you're LOSING money by NOT buying it",
  "the outfit was expensive but the confidence boost is priceless, which means it was worth it",
  "buying two of the same thing in different colors counts as one purchase because it's the same item",
  "if you pay with cash it doesn't count as spending because the money is already gone",
  "it's not an impulse buy if you thought about it for more than 10 minutes",
  "spending money on self-care is an investment in your mental health, which is priceless",
  "if you didn't eat out all week the money you saved covers this completely",
  "the shipping fee doesn't count if you add one more item to get free shipping",
  "buying the bundle is actually cheaper per item so you're saving money by spending more",
  "if it sparks joy it basically pays for itself emotionally",
  "treating yourself after a hard day is cheaper than therapy",
  "if you've been wanting it for over a year, it's a considered purchase not an impulse",
  "the more expensive bag will last longer so over time it's actually the budget choice",
  "if you can pay for it with one day's work it's basically nothing",
  "buying it now saves you from buying something worse later when you're desperate",
  "wearing it once to the event makes it a costume write-off in your mind",
  "the early bird sale means you'd be wasting money waiting for full price",
  "if your friend has it and you share, the cost is technically halved",
  "buying it before a price increase is smart financial planning",
  "the points you earned basically make it free at some point in the future",
  "a limited edition item is an investment — you could sell it for more later",
  "if you manifest it hard enough, the universe will cover the cost somehow",
];

const TH_GIRL_MATH_MOMENTS = [
  'คืนของแล้วได้เงินคืน เท่ากับมีเงินฟรีสำหรับของชิ้นถัดไป',
  'ซื้อรุ่นดีตั้งแต่แรก ไม่ต้องซื้อซ้ำบ่อยๆ สุดท้ายคือประหยัดกว่า',
  'ถ้าหารราคาตามจำนวนวันที่จะใช้ มันแทบจะฟรี',
  'ของลดราคาแปลว่าถ้าไม่ซื้อ เรากำลังพลาดเงินส่วนต่าง',
  'ชุดอาจแพง แต่ความมั่นใจที่ได้กลับมาประเมินค่าไม่ได้',
  'ซื้อสองสีของรุ่นเดียวกัน ยังนับเป็นของประเภทเดียวกันอยู่',
  'จ่ายด้วยเงินสดแล้วเหมือนไม่ได้ใช้เงิน เพราะเงินออกจากบัญชีไปตั้งนานแล้ว',
  'ถ้าคิดเกิน 10 นาที มันไม่ใช่อิมพัลส์แล้ว มันคือการตัดสินใจ',
  'ดูแลตัวเองคือการลงทุนกับสุขภาพใจ และสุขภาพใจแพงกว่านี้เยอะ',
  'ทั้งสัปดาห์ไม่ได้สั่งอาหารข้างนอก เงินที่ประหยัดได้ครอบคลุมชิ้นนี้พอดี',
  'ค่าส่งไม่นับ ถ้าเพิ่มอีกชิ้นแล้วได้ส่งฟรี',
  'ซื้อเป็นเซ็ตถูกกว่าต่อชิ้น แปลว่าใช้เงินมากขึ้นเพื่อประหยัดมากขึ้น',
  'ถ้าของชิ้นนั้นทำให้ใจฟู มันก็คืนทุนทางอารมณ์แล้ว',
  'ให้รางวัลตัวเองหลังวันที่เหนื่อย ยังถูกกว่าค่าฮีลใจหลายอย่าง',
  'อยากได้มานานเป็นปี อันนี้ไม่ใช่ซื้อหุนหันแล้ว เรียกว่าศึกษามานาน',
];

const ES_GIRL_MATH_MOMENTS = [
  'si devuelves algo y te regresan dinero, ese dinero se siente gratis para la siguiente compra',
  'comprar la versión buena desde el principio puede evitar reemplazos, así que a largo plazo ahorra',
  'si divides el precio entre todos los días que lo vas a usar, casi no cuenta',
  'si está en oferta, no comprarlo se siente como perder el descuento',
  'el outfit puede ser caro, pero la confianza que da no tiene precio',
  'comprar el mismo producto en dos colores cuenta como una sola categoría mental',
  'si pagas en efectivo, duele menos porque el dinero ya salió de la cuenta',
  'si lo pensaste más de 10 minutos, ya no es impulso, es investigación',
  'gastar en autocuidado es invertir en tu salud mental',
  'si no pediste comida toda la semana, lo que ahorraste puede cubrir esto',
  'el envío no cuenta si agregas algo más y se vuelve gratis',
  'comprar el paquete sale más barato por pieza, así que gastas más para ahorrar más',
  'si te da alegría cada vez que lo ves, ya está pagando dividendos emocionales',
  'darte un gusto después de un día pesado puede salir más barato que ignorar el estrés',
  'si lo has querido por un año, no es impulso; es una compra con historial',
];

export function getGirlMathMoment(locale?: string): string {
  const currentLocale = contentLocale(locale);
  const moments = currentLocale === 'th'
    ? TH_GIRL_MATH_MOMENTS
    : currentLocale === 'es'
      ? ES_GIRL_MATH_MOMENTS
      : GIRL_MATH_MOMENTS;
  return moments[Math.floor(Math.random() * moments.length)];
}
