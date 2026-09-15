"""Create a one-file preview using only the Python standard library."""
from pathlib import Path
import base64
import json
import sys
import re


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    svg = root / "assets" / "wordmark.svg"
    assets = {}
    mime_types = {".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png"}
    for path in (root / "assets").iterdir():
        if path.suffix in mime_types:
            assets["assets/" + path.name] = (
                "data:" + mime_types[path.suffix] + ";base64,"
                + base64.b64encode(path.read_bytes()).decode("ascii")
            )
    if not svg.exists():
        raise FileNotFoundError("The homepage wordmark is missing: " + str(svg))
    word = {key: assets[key] for key in ("assets/wordmark.svg", "assets/sphere-reference.png")}
    (root / "scene-assets.js").write_text(
        "window.REBUUB_ASSETS=Object.assign(" + json.dumps(word)
        + ",window.REBUUB_ASSETS||{});\n", encoding="utf-8"
    )
    text = (root / "index.html").read_text(encoding="utf-8")
    text = text.replace(
        "<head>", "<head>\n<script>window.REBUUB_PREVIEW=true;window.REBUUB_ASSETS="
        + json.dumps(assets) + ";</script>", 1
    )
    css = (root / "styles.css").read_text(encoding="utf-8")
    text = text.replace('<link rel="stylesheet" href="styles.css">', "<style>\n" + css + "\n</style>")
    interiors = (root / "interiors.css").read_text(encoding="utf-8")
    text = text.replace('<link rel="stylesheet" href="interiors.css">', "<style>\n" + interiors + "\n</style>")
    text = re.sub(r'src="(assets/[^\"]+)"', lambda m: 'src="' + assets.get(m.group(1), m.group(1)) + '"', text)
    for name in ("site-config", "content", "atmosphere", "scene-assets", "wordmark", "sculpture", "spheres", "optics", "scene", "interaction", "app", "interiors"):
        script = "" if name == "scene-assets" else (root / (name + ".js")).read_text(encoding="utf-8")
        # Avoid accidentally closing an inline script from a quoted content string.
        script = script.replace("</script", "<\\/script")
        text = text.replace('<script src="' + name + '.js"></script>', "<script>\n" + script + "\n</script>")
    output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root.parent / "rebuub-clean-preview.html"
    output.write_text(text, encoding="utf-8")
    print("Created " + str(output))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError) as exc:
        print("Preview export failed: " + str(exc), file=sys.stderr)
        sys.exit(1)
