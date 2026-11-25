"""Conservative, bilingual RSS routing based on article text."""
import re
import unicodedata
from html import unescape

POLITICS = "السياسة"

# A section needs an explicit signal in the headline, or a signal supported by
# the excerpt. Publisher and configured feed label never participate.
SIGNALS = {
    POLITICS: (
        r"\b(?:elections?|referendum|parliament|congress|senate|sanctions?|ceasefire|war|diplomac\w*|"
        r"air\s*strikes?|military|rebels?|deportation|prime minister|governor|government|nato|"
        r"white house|president|trump|putin|geopolitic\w*|foreign minister|trade talks|cabinet|"
        r"peace talks|armed forces|crackdown|border dispute|human rights)\b|"
        r"انتخاب|استفتاء|برلمان|الكونغرس|مجلس الشيوخ|عقوبات|وقف (?:اطلاق )?النار|حرب|"
        r"دبلوماس|غار(?:ة|ات)|عسكري|الحوثي|حماس|متمرد|رئيس الوزراء|الحكوم|الناتو|البيت الابيض|"
        r"ترامب|بوتين|الرئيس|وزير الخارجي|مباحثات|فرق التفاوض|مفاوضات|الجيش|ترحيل|حقوق الانسان"
    ),
    "الأمن السيبراني": (
        r"\b(?:cyber[- ]?(?:security|risk|attack\w*)|hackers?|ransomware|malware|zero[- ]day|"
        r"vulnerabilit\w*|cve-\d+|phishing|data breach|credential\w*|auth bypass|sql injection|"
        r"vishing|security flaw|security tool|patching)\b|"
        r"سيبران|اختراق|برمجيات خبيث|ثغر(?:ة|ات)|فدي(?:ة|ه)|تسريب بيانات|تجاوز المصادق"
    ),
    "تحديثات ChatGPT": (
        r"(?:\bchatgpt\b|\bجي بي تي\b).{0,55}(?:\b(?:update\w*|roll\w*|launch\w*|new feature)\b|تحديث|اطلاق|ميزة)|"
        r"(?:\b(?:update\w*|launch\w*|new feature)\b|تحديث|اطلاق|ميزة).{0,55}\bchatgpt\b"
    ),
    "الذكاء الاصطناعي": (
        r"\b(?:ai|artificial intelligence|chatgpt|openai|llms?|gpt-\d+[\w.]*|grok|gemini|claude|"
        r"language models?|machine learning|ai agents?|neural network\w*|model distillation|adversarial distillation)\b|"
        r"ذكاء الاصطناعي|ذكاء التوليدي|نموذج لغوي|نماذج لغوي|تعلم الالة|جي بي تي"
    ),
    "أبل": (
        r"\b(?:iphone|ipad|macbook|macos|ios|ipados|watchos|airpods|airtag|apple\s+(?:watch|inc|"
        r"vision|silicon|developer|intelligence|store|music)|safari browser)\b|"
        r"ايفون|ايباد|ماك بوك|ايربودز|ابل ووتش|شركة ابل"
    ),
    "الاشتراكات الرقمية": (
        r"\b(?:subscription (?:deals?|prices?|discounts?)|(?:youtube|spotify) premium|streaming subscription)\b|"
        r"الاشتراكات الرقمية|عرض اشتراك|تخفيض اشتراك|يوتيوب بريميوم"
    ),
    "التقنية": (
        r"\b(?:android|software|semiconductor\w*|nvidia|gpu\w*|huawei|silicon valley|"
        r"chipmaker\w*|linux|cloud computing|datacenter\w*|data cent(?:er|re)\w*|kubernetes|"
        r"smartphone\w*|robotics|telecom\w*|browser update|processor\w*|satellite internet)\b|"
        r"تقنيات|تقنية|اندرويد|هاتف ذكي|معالج|الرقائق|اشباه الموصلات|برمجي|الحوسبة|روبوت|مراكز البيانات"
    ),
}

# A single famous person, city, country or harmless mention of a government
# cannot turn these subjects into politics.
OFF_TOPIC = re.compile(
    r"\b(?:asteroid|homo erectus|denisovans|beauty pageant|miss universe|superhero|marvel|"
    r"football|world cup|dyslexia|narcissis\w*|undertaker|film trailer|mental health tips)\b|"
    r"كويكب|عسر القراء|ملكة جمال|كاس الامم الافريقي|كرة القدم|الحانوتي|النرجسي|راحتك الذهني"
)
PUBLIC_AFFAIRS = re.compile(
    r"\b(?:elections?|referendum|parliament|sanctions?|ceasefire|war|military|diplomac\w*|"
    r"air\s*strikes?|deportation|armed forces|foreign minister|peace talks|criminal court|"
    r"public policy|economic policy|export controls?|trade talks|geopolitic\w*|regulat\w*)\b|"
    r"انتخاب|استفتاء|برلمان|عقوبات|وقف (?:اطلاق )?النار|حرب|عسكري|دبلوماس|غار(?:ة|ات)|"
    r"ترحيل|الجيش|وزير الخارجي|المحكمة الجنائي|سياسة عام|لوائح|قواعد التصدير|مباحثات|مفاوضات"
)
PATTERNS = {section: re.compile(pattern) for section, pattern in SIGNALS.items()}


def normalize(value):
    value = unicodedata.normalize("NFKC", unescape(value or "")).lower()
    value = re.sub(r"[\u064b-\u065f\u0670\u0640]", "", value)
    return value.translate(str.maketrans("أإآٱ", "اااا"))


def classify_article(title, excerpt=""):
    headline = normalize(title)
    body = normalize(excerpt)[:1600]
    scores = {}
    for section, pattern in PATTERNS.items():
        headline_hits = len(set(pattern.findall(headline)))
        body_hits = len(set(pattern.findall(body)))
        score = 4 * min(headline_hits, 3) + min(body_hits, 3)
        if section == POLITICS:
            # Strong topical evidence in the title wins over passing mentions.
            if PUBLIC_AFFAIRS.search(headline):
                score += 2
            elif not (headline_hits and (body_hits or PUBLIC_AFFAIRS.search(body))):
                continue
            if OFF_TOPIC.search(headline) and not PUBLIC_AFFAIRS.search(headline):
                continue
        if score >= 3:
            scores[section] = score
    return max(scores, key=scores.get, default=None)


def classify_record(story):
    # Prefer what the publisher wrote. Existing Arabic enrichment can provide
    # an additional signal for short or underspecified legacy headlines.
    original = story.get("original_title") or story.get("title_ar")
    excerpt = story.get("excerpt") or story.get("summary_ar")
    story["rss_category"] = classify_article(original, excerpt)
    return story
