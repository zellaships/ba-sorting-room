"""Builds essay/index.html from essay/essay.txt (Cyrus's text, word for word).
The ocean (projector v28) fills the screen; the bar at the bottom opens the essay drawer."""
import html, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
lines = open(os.path.join(HERE, "essay.txt"), encoding="utf-8").read().split("\n")
SECTIONS = ["What water gives", "What we make of it", "What water keeps", "Black Aquatics: the summer"]
SUBHEADS = {"Across the summer:", "The shared water work"}
LABELED = ("Studio day:", "Demo:", "Swim:")
slug = lambda t: re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")
title = lines[0].strip()
body, cur = [], None
for raw in lines[1:]:
    t = raw.strip()
    if not t:
        continue
    if t in SECTIONS:
        if cur: body.append("</section>")
        cur = slug(t)
        body.append(f'<section id="{cur}" data-title="{html.escape(t)}"><h2>{html.escape(t)}</h2>')
    elif t in SUBHEADS:
        body.append(f'<h3>{html.escape(t)}</h3>')
    elif t.startswith(LABELED):
        k, rest = t.split(":", 1)
        body.append(f'<p class="labeled"><b>{html.escape(k)}:</b>{html.escape(rest)}</p>')
    else:
        body.append(f"<p>{html.escape(raw.rstrip())}</p>")
body.append("</section>")
nav = "\n".join(f'<a href="#{slug(s)}" data-s="{slug(s)}">{html.escape(s)}</a>' for s in SECTIONS)
page = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
page = page.replace("{{TITLE}}", html.escape(title)).replace("{{NAV}}", nav).replace("{{BODY}}", "\n".join(body))
open(os.path.join(HERE, "index.html"), "w", encoding="utf-8").write(page)
print("built", len(body), "blocks")
