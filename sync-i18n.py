"""
sync-i18n.py
Sincronizeaza textele din fisierele HTML cu i18n.js (RO),
apoi traduce automat modificarile in EN si HU via Google Translate.
Rulat automat la fiecare deploy.
"""

import re, shutil, os, sys, time

BASE = os.path.dirname(os.path.abspath(__file__))
JS_PATH = os.path.join(BASE, "assets", "i18n.js")

HTML_FILES = [
    "index.html", "cum-functioneaza.html", "conditii.html",
    "despre.html", "suite.html", "rezervare.html", "multumim.html",
    "termeni-cazare.html", "confidentialitate.html", "cookies.html",
    "faq.html", "contact.html"
]

# ── Verifica deep-translator ─────────────────────────────────────────────────
try:
    from deep_translator import GoogleTranslator
    TRANSLATE_OK = True
except ImportError:
    TRANSLATE_OK = False
    print("  [sync-i18n] ATENTIE: deep-translator nu este instalat.")
    print("  Ruleaza: pip install deep-translator")
    print("  Traducerile EN/HU vor fi sarite.")

# ── Helper: extrage blocul unei limbi din JS ──────────────────────────────────
def get_lang_block(content, lang):
    start = content.find(f'"{lang}":')
    langs = ["ro", "en", "hu"]
    idx = langs.index(lang)
    if idx + 1 < len(langs):
        end = content.find(f'"{langs[idx+1]}":')
    else:
        end = content.rfind("};")
    return start, end, content[start:end]

# ── Helper: actualizeaza o cheie intr-un bloc de limba ───────────────────────
def update_key_in_block(block, key, new_val):
    pattern = r'"' + re.escape(key) + r'":\s*"(?:[^"\\]|\\.)*"'
    escaped = new_val.replace("\\", "\\\\").replace('"', '\\"')
    new_entry = f'"{key}": "{escaped}"'
    match = re.search(pattern, block)
    if match:
        if match.group(0) != new_entry:
            block = block[:match.start()] + new_entry + block[match.end():]
            return block, True
        return block, False
    else:
        insert = f'    "{key}": "{escaped}",\n'
        close_idx = block.rfind("  },")
        if close_idx == -1:
            close_idx = block.rfind("  }")
        block = block[:close_idx] + insert + block[close_idx:]
        return block, True

# ── Helper: traduce text ──────────────────────────────────────────────────────
def translate(text, target_lang, retries=3):
    if not TRANSLATE_OK:
        return None
    for attempt in range(retries):
        try:
            result = GoogleTranslator(source="ro", target=target_lang).translate(text)
            time.sleep(0.15)  # evita rate limiting
            return result
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(1)
            else:
                print(f"  [sync-i18n] Eroare traducere ({target_lang}): {e}")
                return None

# ── 1. Extrage key -> text din HTML (sursa de adevar) ────────────────────────
html_texts = {}
for fname in HTML_FILES:
    fpath = os.path.join(BASE, fname)
    if not os.path.exists(fpath):
        continue
    with open(fpath, encoding="utf-8", errors="ignore") as f:
        content = f.read()
    matches = re.findall(r'data-i18n="([^"]+)"[^>]*>([^<\n]+)</', content)
    for key, text in matches:
        text = text.strip()
        if text and key not in html_texts:
            html_texts[key] = text

# ── 2. Citeste i18n.js ────────────────────────────────────────────────────────
with open(JS_PATH, encoding="utf-8") as f:
    js_content = f.read()

ro_start, ro_end, ro_block = get_lang_block(js_content, "ro")
en_start, en_end, en_block = get_lang_block(js_content, "en")
hu_start, hu_end, hu_block = get_lang_block(js_content, "hu")

if ro_start == -1:
    print("  [sync-i18n] EROARE: Bloc 'ro' negasit in i18n.js.")
    sys.exit(1)

# ── 3. Actualizeaza RO si colecteaza cheile modificate ───────────────────────
ro_updated = 0
changed_keys = {}  # key -> nou text RO (pentru traducere)

for key, html_val in html_texts.items():
    # Verifica valoarea curenta din RO
    pattern = r'"' + re.escape(key) + r'":\s*"((?:[^"\\]|\\.)*)"'
    match = re.search(pattern, ro_block)
    current_val = match.group(1) if match else None

    ro_block, changed = update_key_in_block(ro_block, key, html_val)
    if changed:
        ro_updated += 1
        changed_keys[key] = html_val

# ── 4. Traduce cheile modificate in EN si HU ─────────────────────────────────
en_updated = 0
hu_updated = 0

if changed_keys and TRANSLATE_OK:
    print(f"  [sync-i18n] Traduc {len(changed_keys)} chei in EN si HU...")
    for i, (key, ro_text) in enumerate(changed_keys.items(), 1):
        # EN
        en_translated = translate(ro_text, "en")
        if en_translated:
            en_block, changed = update_key_in_block(en_block, key, en_translated)
            if changed:
                en_updated += 1

        # HU
        hu_translated = translate(ro_text, "hu")
        if hu_translated:
            hu_block, changed = update_key_in_block(hu_block, key, hu_translated)
            if changed:
                hu_updated += 1

        # Progress la fiecare 10 chei
        if i % 10 == 0:
            print(f"  [sync-i18n] {i}/{len(changed_keys)} traduse...")

# ── 5. Rescrie i18n.js ────────────────────────────────────────────────────────
if ro_updated > 0 or en_updated > 0 or hu_updated > 0:
    shutil.copy(JS_PATH, JS_PATH + ".bak")

    # Reconstruieste in ordinea corecta
    new_js = (
        js_content[:ro_start] +
        ro_block +
        en_block +
        hu_block +
        js_content[hu_end:]
    )

    with open(JS_PATH, "w", encoding="utf-8") as f:
        f.write(new_js)

    print(f"  [sync-i18n] RO: {ro_updated} chei | EN: {en_updated} chei | HU: {hu_updated} chei actualizate.")
else:
    print("  [sync-i18n] Nicio modificare detectata in i18n.js.")
