import json, os, time, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime, timezone
CONFIG = Path(__file__).resolve().parents[1] / "config/models.json"
class Router:
    def __init__(self):
        self.models = json.loads(CONFIG.read_text())["models"]
        self.key = os.environ["GEMINI_API_KEY"]
        self.used = {}
        self.last = {}
        self.disabled = set()
        self.total = 0
    def generate(self, prompt, analysis=False):
        order = ["gemini-3.6-flash","gemini-3.5-flash-lite"] if analysis else ["gemini-3.5-flash-lite","gemini-3.6-flash"]
        order += [m["id"] for m in self.models if m["role"] == "standby"]
        for name in order:
            m = next(m for m in self.models if m["id"] == name)
            if name in self.disabled or self.used.get(name,0) >= min(m["rpd"], 10) or self.total >= 20:
                continue
            time.sleep(max(0, 60/m["rpm"] - (time.monotonic()-self.last.get(name,0))))
            self.last[name] = time.monotonic()
            self.used[name] = self.used.get(name,0)+1
            self.total += 1
            req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models/"+name+":generateContent", headers={"x-goog-api-key":self.key,"Content-Type":"application/json"}, data=json.dumps({"contents":[{"parts":[{"text":prompt}]}],"generationConfig":{"maxOutputTokens":2048}}).encode())
            try:
                with urllib.request.urlopen(req, timeout=45) as r:
                    result=json.load(r)
                output="".join(p.get("text","") for c in result.get("candidates",[]) for p in c.get("content",{}).get("parts",[]) if not p.get("thought"))
                if output.strip():
                    return output, name
            except urllib.error.HTTPError as e:
                print("MODEL",name,e.code,flush=True)
                if e.code in (401,403): raise RuntimeError("API authorization failed") from None
            except (OSError,ValueError):
                print("MODEL",name,"connection or response error",flush=True)
            self.disabled.add(name)
        raise RuntimeError("No available approved model within run budget")
