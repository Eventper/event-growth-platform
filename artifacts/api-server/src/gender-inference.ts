// First-name → likely-gender inference.
//
// Apollo (and most B2B data sources) have no gender filter, but "I Am Her" is a
// women's leadership community — so we infer a LIKELY gender from the contact's
// first name to prioritise women in discovery. This is a heuristic, not a fact:
// ambiguous / unisex / unknown names resolve to "unknown" and are surfaced for
// human review (the platform's approval gate already requires a human click).
//
// Name sets cover the realistic I Am Her audience: UK/Western + African &
// diaspora (esp. Nigerian/West African) given EventPerfekt's footprint. Diacritics
// are stripped and matching is case-insensitive. This file has no dependencies.

export type LikelyGender = "female" | "male" | "unknown";
export interface GenderGuess { gender: LikelyGender; confidence: number; method: string }

const strip = (s: string) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z'\- ]/g, "").trim();

// Common female first names (Western + African/diaspora). Kept lowercase.
const FEMALE = new Set<string>([
  // Western
  "abigail","ada","adele","agnes","aileen","alexandra","alexia","alice","alicia","alison","amanda","amber","amelia","amy","ana","anastasia","andrea","angela","angelica","anita","ann","anna","anne","annette","annie","antonia","april","ashley","aurora","ava","barbara","beatrice","becky","bella","beth","bethany","betty","beverley","bianca","bonnie","brenda","bridget","brittany","brooke","camilla","candice","caroline","carly","carmen","carol","carolyn","catherine","cecilia","charlotte","chelsea","cheryl","chloe","christina","christine","cindy","claire","clara","claudia","colleen","connie","constance","cora","courtney","crystal","daisy","dana","daniela","danielle","daphne","dawn","debbie","deborah","debra","delia","denise","diana","diane","dolores","donna","dora","doreen","doris","dorothy","ebony","edith","eileen","elaine","eleanor","elena","eliza","elizabeth","ella","ellen","ellie","eloise","elsie","emily","emma","erica","erin","esther","eva","eve","evelyn","faith","fay","felicity","fiona","flora","florence","frances","francesca","freya","gabriella","gail","gemma","genevieve","georgia","georgina","geraldine","gillian","gina","gloria","grace","gwendolyn","hannah","harriet","hayley","hazel","heather","heidi","helen","helena","henrietta","hilary","holly","hope","imogen","ingrid","irene","iris","isabel","isabella","isabelle","isla","ivy","jacqueline","jade","jane","janet","janice","jasmine","jean","jeanette","jemima","jenna","jennifer","jenny","jessica","jill","joan","joanna","joanne","jocelyn","jodie","josephine","joy","joyce","judith","judy","julia","juliana","julie","juliet","june","kara","karen","kate","katherine","kathleen","kathryn","katie","katy","kayla","keira","kelly","kendra","kerry","kim","kimberly","kirsten","kirsty","kristen","lacey","lara","laura","lauren","laurie","leah","leanne","leila","lena","leona","lesley","lilian","lillian","lily","linda","lindsay","lisa","liz","lizzie","lois","lola","loretta","lorraine","louise","lucia","lucinda","lucy","luna","lydia","lynn","mabel","mackenzie","madeleine","madison","maggie","maisie","mandy","mara","margaret","margot","maria","mariana","marian","marie","marilyn","marina","marion","marjorie","marsha","martha","mary","matilda","maureen","maya","megan","melanie","melinda","melissa","mercedes","meredith","mia","michelle","mildred","millie","miranda","miriam","molly","monica","morgan","myra","nadia","nancy","naomi","natalie","natasha","nellie","nicola","nicole","nina","nora","norma","octavia","olive","olivia","opal","ophelia","pamela","patience","patricia","paula","pauline","pearl","peggy","penelope","penny","philippa","phoebe","phyllis","polly","poppy","priscilla","prudence","rachel","rebecca","regina","renee","rhoda","rhonda","rita","roberta","robin","rochelle","rosa","rosalind","rose","rosemary","rosie","rowena","roxanne","ruby","ruth","sabrina","sadie","sally","samantha","sandra","sara","sarah","sasha","scarlett","selena","selina","serena","shannon","sharon","sheila","shelley","sherry","shirley","sienna","silvia","simone","sofia","sonia","sophia","sophie","stacey","stella","stephanie","sue","susan","susanna","suzanne","sybil","sylvia","tabitha","tamara","tammy","tanya","tara","teresa","tessa","thelma","theresa","tiffany","tina","tracy","trinity","ursula","valentina","valerie","vanessa","vera","verity","veronica","vicky","victoria","violet","virginia","vivian","wanda","wendy","whitney","wilma","winifred","yvette","yvonne","zoe","zara",
  // African / West African & diaspora (esp. Nigerian/Yoruba/Igbo/Ghanaian)
  "ada","adaeze","adaobi","adanna","aisha","akosua","amara","amaka","amina","anuoluwapo","aminata","ayesha","ayo","ayoola","ayodele","bola","bolanle","bukola","chiamaka","chidinma","chinwe","chioma","chiamanda","damilola","ebele","efe","eniola","fatima","fatoumata","folake","folasade","funke","funmilayo","grace","halima","ifeoma","ijeoma","kemi","khadija","ladi","lola","mariam","mawunyo","nana","ngozi","nkechi","nneka","ofelia","olabisi","oluwaseun","oluwatobi","omolara","onyeka","oyinkansola","precious","rabi","sade","shade","simisola","temitope","titi","titilayo","tolu","tolulope","uche","uchechi","wuraola","yaa","yetunde","zainab","zara",
  // Continental European female
  "ines","belen","marta","pilar","birgit","petra","anneke","saskia","sieglinde","ute","heike","sabine","martina","franziska","annika","greta","margarethe","liesl","elke","gudrun","helga","monika","renate","ursel","wibke","carla","chiara","francesca","giulia","federica","valentina","alessandra","martaalessia","alessia","ilaria","aurelia","beatrice","bianca","cosima","emanuela","giovanna","ludovica","manuela","ornella","paola","raffaella","rossana","stefania","ana","catalina","dolores","esperanza","inmaculada","lucia","mercedes","montserrat","nuria","rocio","soledad","agnieszka","anita","ewa","grazyna","halina","jadwiga","katarzyna","magdalena","malgorzata","wanda","wioletta","zofia","anastasia","ekaterina","irina","ludmila","nadezhda","natalia","oksana","olga","svetlana","tatiana","yulia",
]);

// Common male first names (Western + African/diaspora).
const MALE = new Set<string>([
  "aaron","abdul","abel","abraham","adam","adebayo","adrian","ahmed","aiden","ajayi","alan","albert","alex","alexander","alfred","ali","allan","alvin","amos","andre","andrew","angus","anthony","antonio","archie","arnold","arthur","ashton","austin","barry","basil","ben","benedict","benjamin","bernard","bill","billy","blake","bob","boris","brad","bradley","brandon","brendan","brett","brian","bruce","bryan","caleb","calvin","cameron","carl","carlos","cedric","chad","charles","charlie","chibuike","chidi","chris","christian","christopher","chukwuemeka","clarence","claude","clifford","clinton","clive","cody","cole","colin","connor","conrad","cornelius","craig","curtis","cyril","dale","damian","damon","dan","daniel","danny","darius","darren","darryl","dave","david","dean","dennis","derek","desmond","dexter","dominic","don","donald","douglas","duncan","dustin","dwight","dylan","earl","ed","eddie","edgar","edmund","edward","edwin","elijah","elliot","elliott","emeka","emmanuel","eric","ernest","ethan","eugene","evan","ezra","felix","ferdinand","fernando","finley","floyd","francis","frank","franklin","fred","frederick","gabriel","gareth","garrett","gary","gavin","gene","geoffrey","george","gerald","gilbert","glen","glenn","godwin","gordon","graham","grant","greg","gregory","gus","guy","harold","harrison","harry","harvey","hassan","hector","henry","herbert","howard","hugh","hugo","ian","ibrahim","ifeanyi","igor","isaac","ivan","jack","jackson","jacob","jake","james","jamie","jared","jason","jasper","javier","jay","jed","jeff","jeffrey","jeremy","jerome","jerry","jesse","jim","jimmy","joe","joel","john","johnny","jon","jonathan","jordan","jose","joseph","josh","joshua","julian","justin","kanye","karl","keith","kelvin","ken","kenneth","kevin","kingsley","kirk","kunle","kyle","lance","larry","laurence","lawrence","lee","leo","leon","leonard","leroy","leslie","lewis","liam","lionel","lloyd","logan","louis","luca","lucas","luke","luther","mahmoud","malcolm","marc","marcus","mario","mark","marshall","martin","marvin","mason","mathew","matthew","maurice","max","maxwell","mensah","micah","michael","mike","miles","milton","mitchell","mohammed","muhammad","morris","moses","murray","musa","nasir","nathan","nathaniel","neil","nelson","nicholas","nick","nigel","noah","noel","norman","obi","oliver","olu","oluwaseun","omar","oscar","oswald","otis","owen","patrick","paul","percy","perry","pete","peter","philip","phillip","pierre","preston","quentin","quinton","ralph","randall","randy","raphael","ray","raymond","reginald","rex","richard","rick","ricky","robert","roberto","robin","roderick","rodney","roger","roland","ronald","ronnie","rory","ross","roy","ruben","rupert","russell","ryan","said","salem","sam","samuel","scott","sean","sebastian","segun","seth","shane","shaun","sidney","simon","solomon","spencer","stanley","stephen","steve","steven","stewart","stuart","sunday","sylvester","tariq","ted","terence","terry","theo","theodore","thomas","tim","timothy","toby","todd","tom","tommy","tony","travis","trevor","tristan","troy","tunde","tyler","tyrone","uche","ulysses","usman","valentine","vernon","victor","vincent","virgil","wade","wallace","walter","warren","wayne","wesley","wilbur","wilfred","will","william","willie","wilson","winston","xavier","yusuf","zachary","zane",
  // Continental European male (German/Nordic/Italian/Iberian/Slavic)
  "dirk","gerd","joerg","jorg","jurgen","klaus","hans","ingo","lars","sven","bjorn","bjoern","mats","nils","ola","stefan","stephan","thorsten","torsten","uwe","wolfgang","helmut","horst","manfred","reinhard","rolf","detlef","gunther","gunter","heinz","kurt","matthias","sebastiano","laszlo","zoltan","attila","csaba","gabor","istvan","tibor","marcel","marcelo","matteo","pietro","paolo","giuseppe","giovanni","lorenzo","alessandro","stefano","riccardo","fabio","federico","emanuele","gianluca","massimo","pablo","jorge","diego","alvaro","ignacio","joaquin","rafael","ramon","santiago","joao","tiago","thiago","rui","pedro","sergey","sergei","dmitry","dmitri","vladimir","pavel","andrei","aleksei","alexei","mikhail","nikolai","yuri","viktor","alexandros","dimitris","kostas","nikos","yannis","giorgos",
  // South Asian / Middle Eastern / East Asian male
  "raj","rajesh","kishan","anil","sanjay","rahul","vikram","arjun","amit","deepak","sandeep","vijay","ramesh","suresh","ravi","manish","ashok","gaurav","nikhil","pranav","aditya","rohan","karan","varun","tarek","khaled","walid","sami","fadi","nabil","ziad","hiroshi","kenji","takeshi","yuki","haruto","ren","wei","jin","jun","ming","hao","chen","feng","liang","kwame","kofi","kojo","yaw","tendai","thabo","sipho","oluwafemi","babatunde","chukwu","ikenna","obinna",
]);

// Names that genuinely cut both ways → never guess; let a human decide.
const UNISEX = new Set<string>([
  "alex","ariel","ashley","bailey","blair","brook","brooke","cameron","carmen","casey","charlie","chris","dana","drew","frances","francis","gabriel","jamie","jay","jesse","jo","jordan","jules","kelly","kim","lee","leslie","logan","lou","mackenzie","morgan","nicky","pat","quinn","reese","riley","robin","rory","sam","sandy","sasha","sidney","sydney","taylor","terry","toby","val","whitney",
]);

export function inferGender(firstName: string): GenderGuess {
  const n = strip(firstName).split(" ")[0]; // first token only
  if (!n || n.length < 2) return { gender: "unknown", confidence: 0, method: "empty" };
  if (UNISEX.has(n)) return { gender: "unknown", confidence: 0.2, method: "unisex" };
  const f = FEMALE.has(n);
  const m = MALE.has(n);
  if (f && !m) return { gender: "female", confidence: 0.9, method: "namelist" };
  if (m && !f) return { gender: "male", confidence: 0.9, method: "namelist" };
  if (f && m) return { gender: "unknown", confidence: 0.2, method: "ambiguous" };
  // Weak morphological hint for names not in the lists (e.g. many female names
  // end -a/-ia/-elle/-ette). Low confidence — flagged, not asserted.
  if (/(?:a|ia|ina|elle|ette|een|lyn|wen)$/.test(n)) return { gender: "female", confidence: 0.45, method: "suffix" };
  return { gender: "unknown", confidence: 0, method: "unlisted" };
}

// Convenience: is this contact a likely woman (for women-first targeting)?
export function isLikelyWoman(firstName: string, threshold = 0.6): boolean {
  const g = inferGender(firstName);
  return g.gender === "female" && g.confidence >= threshold;
}

// ── AI classifier (primary) ──────────────────────────────────────────────────
// The name lists above are an offline FALLBACK — not something we hand-maintain
// per name. The primary path asks the model (via OpenRouter, already funded) to
// classify a batch of first names in ONE cheap call. It handles any name from any
// culture, so we never go back to "add another name to the list". Results are
// cached per-name for the process lifetime so repeat discoveries don't re-pay.
//
// NB: the AI deps are imported LAZILY inside inferGenderBatch so that the sync
// offline path (inferGender) carries no dependency on the AI/runtime stack and
// can be reused in lightweight standalone scripts.

const aiCache = new Map<string, GenderGuess>();

function firstNameKey(name: string): string {
  return strip(name).split(" ")[0];
}

/**
 * Classify a batch of names → gender. One AI call for everything not already
 * cached; anything the AI can't place (or if the call fails) falls back to the
 * offline heuristic above. Returns a map keyed by the ORIGINAL input string.
 */
export async function inferGenderBatch(names: string[]): Promise<Record<string, GenderGuess>> {
  const out: Record<string, GenderGuess> = {};
  const need = new Map<string, string>(); // key -> original
  for (const raw of names) {
    const key = firstNameKey(raw);
    if (!key || key.length < 2) { out[raw] = { gender: "unknown", confidence: 0, method: "empty" }; continue; }
    const cached = aiCache.get(key);
    if (cached) { out[raw] = cached; continue; }
    if (!need.has(key)) need.set(key, raw);
  }

  const keys = [...need.keys()];
  if (keys.length) {
    try {
      const { callOpenRouter, MODELS } = await import("./ai-shared");
      const prompt =
        "Classify the LIKELY gender associated with each first name below. " +
        "Use real-world name frequency across cultures (Western, African/Nigerian/Yoruba/Igbo, " +
        "South Asian, East Asian, Arabic, European). Return STRICT JSON only: " +
        `{"results":[{"name":"<name>","gender":"female|male|unknown","confidence":0.0-1.0}]}. ` +
        "Use \"unknown\" (low confidence) for genuinely unisex or ambiguous names. " +
        "Names:\n" + keys.join("\n");
      const r = await callOpenRouter(
        MODELS.classify,
        [{ role: "user", content: prompt }],
        { maxTokens: 1200, temperature: 0, jsonMode: true }
      );
      const parsed = JSON.parse(r.content || "{}");
      const byKey = new Map<string, GenderGuess>();
      for (const row of parsed.results || []) {
        const k = strip(String(row.name || "")).split(" ")[0];
        const gender: LikelyGender = row.gender === "female" || row.gender === "male" ? row.gender : "unknown";
        const confidence = Math.max(0, Math.min(1, Number(row.confidence) || 0));
        if (k) byKey.set(k, { gender, confidence, method: "ai" });
      }
      for (const [key, raw] of need) {
        const g = byKey.get(key) || inferGender(raw); // AI miss → offline fallback
        aiCache.set(key, g);
        out[raw] = g;
      }
    } catch (err: any) {
      try {
        const { logger } = await import("./lib/logger");
        logger.warn({ err: err?.message }, "Gender AI classify failed — using offline fallback");
      } catch { /* logging is best-effort */ }
      for (const [, raw] of need) out[raw] = inferGender(raw);
    }
  }
  return out;
}
