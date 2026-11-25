import json
from pathlib import Path
from datetime import datetime
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor
class Meta(HTMLParser):
    def __init__(self):
        super().__init__()
        self.image = ''
        self.candidates = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'link' and a.get('rel') == 'image_src':
            self.candidates.append(a.get('href',''))
        if tag == 'meta' and (a.get('property') or a.get('name')) in ('og:image', 'twitter:image', 'og:image:secure_url', 'twitter:image:src'):
            self.candidates.append(a.get('content', ''))
        if tag == 'meta' and a.get('itemprop') == 'image':
            self.candidates.append(a.get('content',''))
def fetch(item):
    try:
        url = item['article_url']
        if urlparse(url).scheme != 'https':
            return None
        with urlopen(Request(url, headers={'User-Agent':'Mozilla/5.0 (compatible; ZamenNewsReader/1.1)', 'Accept':'text/html,application/xhtml+xml'}), timeout=8) as response:
            parser = Meta()
            parser.feed(response.read(2500000).decode('utf-8', errors='replace'))
            for candidate in parser.candidates:
                if not candidate: continue
                image = urljoin(response.geturl(), candidate)
                if urlparse(image).scheme == 'https':
                    return item['id'], image
    except Exception as e:
        print('IMAGE', item.get('id'), type(e).__name__)
    else:
        print('NO_IMAGE', item.get('id'))
    return None
p = Path('data/images.json')
old = json.loads(p.read_text()) if p.exists() else {}
items = {}
for f in ('data/news.json', 'data/sheets-news.json'):
    if Path(f).exists():
        items.update({x['id']: x for x in json.loads(Path(f).read_text()).get('items', [])})
result = {k:v for k,v in old.items() if k in items}
def freshness(x):
    v=x.get('published_at','')
    try: return datetime.fromisoformat(v.replace('Z','+00:00')).timestamp()
    except (ValueError, TypeError):
        try: return parsedate_to_datetime(v).timestamp()
        except (ValueError, TypeError, OverflowError): return 0
pending=sorted((x for k,x in items.items() if k not in result and (x.get('title_ar') or x.get('title')) and x.get('article_url')),key=freshness,reverse=True)
with ThreadPoolExecutor(max_workers=8) as pool:
    for pair in pool.map(fetch, pending[:120]):
        if pair:
            result[pair[0]] = pair[1]
p.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True)+'\n')
