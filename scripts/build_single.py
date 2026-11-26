"""Bundle the site into one self-contained HTML file: dist/paddy-field.html.
Run:  python3 scripts/build_single.py
"""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
css = (ROOT / "css/style.css").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="css/style.css">', f"<style>\n{css}\n</style>")
for src in ["js/paddy-heads.js", "data/famines.js", "js/app.js"]:
    js = (ROOT / src).read_text(encoding="utf-8").replace("</script", "<\\/script")
    html = html.replace(f'<script src="{src}"></script>', f"<script>\n{js}\n</script>")
assert 'src="' not in re.sub(r'<link[^>]+>', '', html), "unbundled file left"
(ROOT / "dist").mkdir(exist_ok=True)
(ROOT / "dist/paddy-field.html").write_text(html, encoding="utf-8")
print("wrote dist/paddy-field.html", len(html) // 1024, "KB")
