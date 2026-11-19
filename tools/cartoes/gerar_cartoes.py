#!/usr/bin/env python3
"""
Gera os cartões de visita digitais da direcção da Daner Energias.

Uso (a partir da raiz do site):
    pip install segno
    python3 tools/cartoes/gerar_cartoes.py                      # QR para o GitHub Pages (teste)
    python3 tools/cartoes/gerar_cartoes.py --base https://www.daner.ao/cartao   # QR final

Lê os dados de tools/cartoes/cartoes.json e escreve em cartao/:
    cartao/<slug>.html        página do cartão (o endereço que o QR abre)
    cartao/vcf/<slug>.vcf     contacto para a agenda do telemóvel
    cartao/qr/<slug>.svg      QR em vector (impressão)
    cartao/qr/<slug>.png      QR em imagem
    cartao/fotos/<slug>.jpg   fotografia quadrada (opcional, máx. 100 KB); se existir, aparece no cartão
    cartao/fotos/originais/   fotografias originais (não são usadas pelas páginas)
Para acrescentar um director, basta adicionar uma entrada ao cartoes.json.
"""
import argparse, io, json, re, sys
from pathlib import Path
from urllib.parse import quote
import segno

BASE_TESTE = "https://maravilhakainos.github.io/daner-site/cartao"
RAIZ = Path(__file__).resolve().parents[2]

ICONS = {
 'phone':'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
 'mail':'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
 'globe':'<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
 'pin':'<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
 'share':'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
 'user':'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
 'adduser':'<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
 'wa':'<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
 'headset':'<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
 'qr':'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h1"/>',
}
def ic(n):
    return f'<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[n]}</svg>'

def fmt_tel(t):  # +244921851415 -> +244 921 851 415
    d = re.sub(r'\D', '', t)
    return f'+{d[:3]} {d[3:6]} {d[6:9]} {d[9:]}'

CSS = '''@font-face{font-family:Roboto;font-weight:400;font-display:swap;src:url(../fonts/roboto-400.woff) format("woff")}
@font-face{font-family:Roboto;font-weight:500;font-display:swap;src:url(../fonts/roboto-500.woff) format("woff")}
@font-face{font-family:Roboto;font-weight:700;font-display:swap;src:url(../fonts/roboto-700.woff) format("woff")}
:root{--navy:#052038;--navy-2:#0b2f4f;--lima:#c1ff1b;--blue:#0f50ac;--green:#1f8d41;--ink:#1E2733;--line:rgba(255,255,255,.18);--muted:#c3cfdb}
*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-text-size-adjust:100%}
body{font-family:Roboto,system-ui,-apple-system,"Segoe UI",Arial,sans-serif;background:#e9eef4;color:var(--ink);min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:20px 14px 28px}
.wrap{width:100%;max-width:420px}
.card{background:linear-gradient(180deg,var(--navy) 0%,var(--navy-2) 100%);border-radius:22px;padding:22px 22px 18px;color:#fff;box-shadow:0 14px 40px rgba(5,32,56,.28)}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.logo{height:30px;width:auto;display:block}
.badge{font-size:12px;font-weight:500;color:var(--lima);background:rgba(193,255,27,.12);border:1px solid rgba(193,255,27,.35);padding:4px 10px;border-radius:999px;white-space:nowrap}
.id{text-align:center;margin-top:26px}
.avatar{width:92px;height:92px;border-radius:50%;background:#fff;color:var(--navy);margin:0 auto 14px;display:grid;place-items:center;overflow:hidden;border:3px solid rgba(193,255,27,.9)}
.avatar svg{width:40px;height:40px;color:var(--navy)}
.avatar img{width:100%;height:100%;object-fit:cover;display:block}
h1{font-size:24px;font-weight:700;line-height:1.2}
.role{margin-top:6px;font-size:15px;color:var(--muted)}
hr{border:0;border-top:1px solid var(--line);margin:22px 0 8px}
.list{list-style:none}
.list a{display:flex;align-items:flex-start;gap:14px;padding:12px 4px;color:#fff;text-decoration:none;font-size:16px;line-height:1.35;border-radius:10px;word-break:break-word}
.list a:hover{background:rgba(255,255,255,.06)}
.sub{display:block;font-size:13px;color:var(--muted);margin-top:2px}
.ic{width:20px;height:20px;flex:none;color:var(--lima);margin-top:1px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;min-height:52px;border-radius:12px;font:700 17px Roboto,system-ui,sans-serif;text-decoration:none;cursor:pointer;border:0}
.btn.main{background:var(--lima);color:var(--ink);margin-top:14px}
.btn.main .ic{color:var(--ink)}
.btn.main:hover{background:#d3ff55}
.row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
.btn.sec{min-height:48px;font-size:15px;font-weight:500;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,.35)}
.btn.sec:hover{background:rgba(255,255,255,.08)}
.btn.wa{border-color:rgba(193,255,27,.55)}
details{margin-top:10px}
summary{list-style:none}
summary::-webkit-details-marker{display:none}
details[open] summary{border-color:var(--lima)}
.qrbox{background:#fff;border-radius:16px;padding:14px;margin-top:10px;text-align:center;color:var(--ink)}
.qr-svg{width:100%;max-width:220px;height:auto;display:block;margin:0 auto}
.qrbox p{font-size:13px;margin-top:8px;color:#4b5563}
.foot{text-align:center;font-size:12px;color:#8fa3b6;margin-top:16px}
a:focus-visible,summary:focus-visible,button:focus-visible{outline:3px solid var(--lima);outline-offset:2px}
@media (min-width:600px){body{align-items:center;padding:40px}}
@media (prefers-reduced-motion:no-preference){.btn,.list a{transition:background .15s}}'''

def vcard(d, cfg):
    m = cfg['morada']
    rua = m['rua'].replace(',', '\\,')
    return "\r\n".join([
        "BEGIN:VCARD", "VERSION:3.0",
        f"N:{d['apelido']};{d['primeiro']};;;", f"FN:{d['nome']}",
        f"ORG:{cfg['empresa']}", f"TITLE:{d['cargo']}",
        f"TEL;TYPE=WORK,VOICE,CELL:{d['telefone']}",
        *([f"item1.TEL;TYPE=WORK,VOICE:{cfg['apoio_cliente']}", "item1.X-ABLabel:Apoio ao cliente"] if cfg.get('apoio_cliente') else []),
        f"EMAIL;TYPE=WORK,INTERNET:{d['email']}",
        f"URL:{cfg['site']}",
        f"ADR;TYPE=WORK:;;{rua};{m['cidade']};;;{m['pais']}",
        "NOTE:" + (f"Extensão {d['extensao']}. " if d.get('extensao') else "") + f"{cfg['empresa']} | {cfg['slogan']}.",
        "END:VCARD", ""])

def qr_inline(q, nome):
    buf = io.BytesIO()
    q.save(buf, kind='svg', scale=1, border=2, dark='#052038', light='#ffffff', xmldecl=False, svgns=True, nl=False)
    s = buf.getvalue().decode()
    s = re.sub(r'\s(width|height)="[^"]*"', '', s, count=2).replace(' class="segno"', '')
    n = q.symbol_size(scale=1, border=2)[0]
    return s.replace('<svg ', f'<svg role="img" aria-label="QR code do cartão digital de {nome}" class="qr-svg" viewBox="0 0 {n} {n}" ', 1)

def pagina(d, cfg, logo, qr_svg, foto=False):
    tel = fmt_tel(d['telefone']); digitos = re.sub(r'\D', '', d['telefone'])
    mapa = 'https://www.google.com/maps/search/?api=1&amp;query=' + quote(cfg['morada']['rua'].replace(',', '') + ' ' + cfg['morada']['cidade'] + ' ' + cfg['morada']['pais'], safe='').replace('%20', '+')
    morada = f"{cfg['morada']['rua']}, {cfg['morada']['cidade']}, {cfg['morada']['pais']}"
    site_txt = cfg['site'].replace('https://', '')
    wa = f"https://wa.me/{digitos}?text=" + quote(f"Olá, {d['primeiro']}.")
    n = d['nome']; c = d['cargo']
    ext_html = f'<span class="sub">Extensão {d["extensao"]}</span>' if d.get('extensao') else ''
    apoio_html = (f'\n    <li><a href="tel:{cfg["apoio_cliente"]}">{ic("headset")}<span>{fmt_tel(cfg["apoio_cliente"])}<span class="sub">Apoio ao cliente</span></span></a></li>' if cfg.get('apoio_cliente') else '')
    avatar = (f'<div class="avatar"><img src="fotos/{d["slug"]}.jpg" alt="{n}" width="92" height="92"></div>' if foto
              else f'<!-- Sem fotografia: colocar uma imagem quadrada em fotos/{d["slug"]}.jpg (máx. 100 KB) e voltar a gerar -->\n    <div class="avatar" aria-hidden="true">{ic("user")}</div>')
    return f'''<!DOCTYPE html>
<html lang="pt-AO">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{n} | {c} | {cfg['empresa']}</title>
<meta name="description" content="Cartão digital de {n}, {c} da {cfg['empresa']}.">
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#052038">
<link rel="icon" type="image/png" href="../images/favicon-64.png">
<style>
{CSS}
</style>
</head>
<body>
<main class="wrap">
<article class="card" aria-label="Cartão digital de {n}">
  <div class="top">
    {logo}
    <span class="badge">Cartão digital</span>
  </div>

  <header class="id">
    {avatar}
    <h1>{n}</h1>
    <p class="role">{c}</p>
  </header>

  <hr>

  <ul class="list">
    <li><a href="tel:{d['telefone']}">{ic('phone')}<span>{tel}{ext_html}</span></a></li>{apoio_html}
    <li><a href="mailto:{d['email']}">{ic('mail')}<span>{d['email']}</span></a></li>
    <li><a href="{cfg['site']}" target="_blank" rel="noopener">{ic('globe')}<span>{site_txt}</span></a></li>
    <li><a href="{mapa}" target="_blank" rel="noopener">{ic('pin')}<span>{morada}</span></a></li>
  </ul>

  <a class="btn main" href="vcf/{d['slug']}.vcf" download="{n}.vcf">{ic('adduser')}Guardar contacto</a>

  <div class="row">
    <a class="btn sec wa" href="{wa}" target="_blank" rel="noopener">{ic('wa')}WhatsApp</a>
    <button class="btn sec" type="button" id="share" hidden>{ic('share')}Partilhar</button>
  </div>

  <details>
    <summary class="btn sec">{ic('qr')}Mostrar QR code</summary>
    <div class="qrbox">
      {qr_svg}
      <p>Aponte a câmara do telemóvel para guardar este cartão.</p>
    </div>
  </details>

  <p class="foot">{cfg['empresa']} | {cfg['slogan']}</p>
</article>
</main>
<script>
(function(){{
  var b=document.getElementById('share');
  if(!b||!navigator.share)return;
  b.hidden=false;
  b.addEventListener('click',function(){{
    navigator.share({{title:'{n} | {cfg['empresa']}',text:'Cartão digital de {n}, {c} da {cfg['empresa']}.',url:location.href}}).catch(function(){{}});
  }});
}})();
</script>
</body>
</html>
'''

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', default=BASE_TESTE, help='endereço da pasta cartao usado nos QR (sem barra final)')
    ap.add_argument('--saida', default=str(RAIZ / 'cartao'))
    a = ap.parse_args()
    base = a.base.rstrip('/')
    cfg = json.loads((Path(__file__).parent / 'cartoes.json').read_text(encoding='utf8'))
    logo = (RAIZ / 'images/svg/Logo horizontal para fundos escuro.svg').read_text(encoding='utf8')
    logo = re.sub(r'<\?xml[^>]*\?>\s*', '', logo).replace('<svg ', f'<svg class="logo" role="img" aria-label="{cfg["empresa"]}" ', 1)
    out = Path(a.saida); (out / 'vcf').mkdir(parents=True, exist_ok=True); (out / 'qr').mkdir(exist_ok=True)
    for d in cfg['directores']:
        url = f"{base}/{d['slug']}.html"
        q = segno.make(url, error='m')
        q.save(str(out / 'qr' / f"{d['slug']}.svg"), scale=10, border=4, dark='#052038', light='#ffffff', xmldecl=False, svgns=True)
        q.save(str(out / 'qr' / f"{d['slug']}.png"), scale=20, border=4, dark='#052038', light='#ffffff')
        (out / 'vcf' / f"{d['slug']}.vcf").write_text(vcard(d, cfg), encoding='utf8', newline='')
        (out / f"{d['slug']}.html").write_text(pagina(d, cfg, logo, qr_inline(q, d['nome']), (out / 'fotos' / f"{d['slug']}.jpg").exists()), encoding='utf8')
        print('OK', d['slug'], '->', url)

if __name__ == '__main__':
    main()
