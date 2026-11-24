import os, json, urllib.request, urllib.error, time

BASE = "https://generativelanguage.googleapis.com/v1beta/"
KEY = os.environ["GEMINI_API_KEY"]
# Explicit opt-in only: discovery does not establish free pricing.
ALLOW = set(os.getenv("ZAMEN_FREE_MODEL_IDS", "").split(",")) - {""}

def request(path, payload=None):
    req = urllib.request.Request(BASE + path, headers={"x-goog-api-key": KEY, "Content-Type": "application/json"}, data=None if payload is None else json.dumps(payload).encode())
    with urllib.request.urlopen(req, timeout=35) as response:
        return json.load(response)

def main():
    models = []
    token = ""
    while True:
        page = request("models?pageSize=100" + ("&pageToken=" + token if token else ""))
        models.extend(page.get("models", []))
        token = page.get("nextPageToken")
        if not token:
            break
    for model in models:
        name = model["name"]
        methods = model.get("supportedGenerationMethods", [])
        print(name, ", ".join(methods), flush=True)
        if name not in ALLOW:
            continue
        method = "generateContent" if "generateContent" in methods else "embedContent" if "embedContent" in methods else None
        if not method:
            continue
        payload = {"contents":[{"parts":[{"text":"Reply with OK only."}]}], "generationConfig":{"maxOutputTokens":128}} if method == "generateContent" else {"content":{"parts":[{"text":"Zamen news test"}]}}
        try:
            result = request(name + ":" + method, payload)
            if method == "generateContent":
                parts = [p for c in result.get("candidates", []) for p in c.get("content", {}).get("parts", []) if not p.get("thought")]
                valid = any(p.get("text", "").strip() for p in parts)
            else:
                valid = bool(result.get("embedding", {}).get("values"))
            print("PASS" if valid else "FAIL_EMPTY", name, flush=True)
        except urllib.error.HTTPError as exc:
            try:
                detail = json.loads(exc.read()).get("error", {})
                message = str(detail.get("message", ""))[:400].replace(KEY, "[REDACTED]")
            except Exception:
                message = ""
            print("FAIL", name, exc.code, message, flush=True)
        except (TimeoutError, urllib.error.URLError, OSError, ValueError) as exc:
            print("FAIL", name, type(exc).__name__, flush=True)
        time.sleep(13)

if __name__ == "__main__":
    main()
