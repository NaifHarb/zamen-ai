import io
import unittest
from unittest.mock import patch

from news import collect
from news_classification import POLITICS, classify_article, classify_record


class NewsClassificationTests(unittest.TestCase):
    def test_bilingual_topics(self):
        cases = [
            ("فرضُ عقوبات على قادة عسكريين", "", POLITICS),
            ("Ceasefire negotiations resume in Cairo", "", POLITICS),
            ("Election candidates targeted by coordinated AI fakes", "", POLITICS),
            ("The president attended the World Cup final", "", None),
            ("Four years after an asteroid crash, spacecraft assesses the damage", "", None),
            ("ماذا نعرف عن الحانوتي الذي دفن آلاف الأشخاص؟", "", None),
            ("الأم النرجسية: حقيقة مسكوت عنها في المجتمع؟", "", None),
            ("ملكة جمال الكون تحصد التاج", "", None),
            ("Government spokesperson presents the Miss Universe finalists", "", None),
            ("Android software update reaches new devices", "", "التقنية"),
            ("ثغرة سيبرانية حرجة في إحدى خدمات الحوسبة", "", "الأمن السيبراني"),
            ("نموذج جديد للذكاء الاصطناعي", "", "الذكاء الاصطناعي"),
            ("ChatGPT rolls out a new feature", "", "تحديثات ChatGPT"),
            ("iPad Air receives a display upgrade", "", "أبل"),
            ("عرض اشتراك جديد ليوتيوب بريميوم", "", "الاشتراكات الرقمية"),
        ]
        for title, excerpt, expected in cases:
            with self.subTest(title=title):
                self.assertEqual(classify_article(title, excerpt), expected)

    def test_archive_preserves_original_fields(self):
        original = {"id": "42", "source": "BBC Arabic", "category": POLITICS,
                    "original_title": "خبر عن كويكب", "summary_ar": "ملخص قديم"}
        amended = classify_record(original.copy())
        self.assertIsNone(amended.pop("rss_category"))
        self.assertEqual(amended, original)

    def test_political_fallback_filters_before_publication(self):
        xml = b"""<rss><channel>
          <item><link>https://example.com/politics</link><title>Parliament debates sanctions</title></item>
          <item><link>https://example.com/science</link><title>Scientists monitor asteroid</title></item>
          <item><link>https://example.com/community</link><title>Families discuss narcissism</title></item>
          <item><link>https://example.com/tech</link><title>Android software update arrives</title></item>
        </channel></rss>"""
        feeds = [(POLITICS, "General publisher", "https://example.com/feed")]
        with patch("news.FEEDS", feeds), patch("news.urllib.request.urlopen", side_effect=lambda *a, **k: io.BytesIO(xml)):
            self.assertEqual([r["rss_category"] for r in collect(True)], [POLITICS])
            self.assertEqual([r["rss_category"] for r in collect()], [POLITICS, "التقنية"])


if __name__ == "__main__":
    unittest.main()
