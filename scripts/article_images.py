import json
from pathlib import Path
from html.parser import HTMLParser
from urllib.request import Request, urlopen
from urllib.parse import urljoin, urlparse
from concurrent.futures import ThreadPoolExecutor
class Meta(HTMLParser):
    def __init__(self):
        super().__init__()
        self.image = ''
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta' and (a.get('property') or a.get('name')) in ('og:image', 'twitter:image', 'og:image:secure_url'):
            self.image = self.image or a.get('content', '')
def fetch(item):
    try:
        url = item['article_url']
        if urlparse(url).scheme != 'https':
            return None
        with urlopen(Request(url, headers={'User-Agent':'ZamenNewsReader/1.0'}), timeout=8) as response:
            parser = Meta()
            parser.feed(response.read(1000000).decode('utf-8', errors='replace'))
            image = urljoin(response.geturl(), parser.image) if parser.image else ''
            if urlparse(image).scheme == 'https':
                return item['id'], image
    except Exception:
        pass
    return None
p = Path('data/images.json')
old = json.loads(p.read_text()) if p.exists() else {}
items = {}
for f in ('data/news.json', 'data/sheets-news.json'):
    if Path(f).exists():
        items.update({x['id']: x for x in json.loads(Path(f).read_text()).get('items', [])})
result = {k:v for k,v in old.items() if k in items}
with ThreadPoolExecutor(max_workers=8) as pool:
    for pair in pool.map(fetch, [x for k,x in items.items() if k not in result][:120]):
        if pair:
            result[pair[0]] = pair[1]
p.write_text(json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True)+'\n')
