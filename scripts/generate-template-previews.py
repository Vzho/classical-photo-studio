# 模板预览图生成器：按每套模板的真实 tokens 渲染版面并截图。
# 
# 用途：shared/decoration/templates/{id}/manifest.json 声明了 preview.cover 与
# preview.pages（4 张页面图），但仓库中不存在这些文件，模板中心 <img> 全部裂图。
# 
# 说明：TODO.md P0 要求的「真机截图」需在小程序开发者工具/真机上截取，
# 本脚本产出的是「按模板 tokens 高保真还原的版面预览」，用于模板中心选型对比，
# 可在拿到真机截图后直接替换同名文件（路径与尺寸已按 manifest 约定固定）。
# 
# 用法：python scripts/generate-template-previews.py
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES_DIR = os.path.join(ROOT, 'shared', 'decoration', 'templates')

# 预览图尺寸：封面 16:9，页面图 3:4（贴近小程序竖屏比例）
COVER_SIZE = (1200, 675)
PAGE_SIZE = (750, 1000)

# 示例文案（按语言风格匹配模板调性）
COPY = {
    'editorial-gray': {
        'en': True,
        'hero': ('Ancient Light', 'PORTFOLIO 2026'),
        'sections': [
            ('Selected Works', 'A study in light and form'),
            ('About the Studio', 'Ten years of quiet portraits'),
            ('Packages', 'Collection offerings'),
        ],
        'nav': ['Selected', 'About', 'Services', 'Contact'],
        'items': ['Portrait', 'Wedding', 'Editorial', 'Family', 'Fashion', 'Maternity'],
        'prices': ['¥ 6,800', '¥ 12,000', '¥ 9,800'],
        'team_title': 'The Team', 'team_desc': 'Lead Photographer',
        'quote_title': 'Testimonials', 'quote_desc': 'Client feedback',
        'footer_title': 'Contact Us', 'footer_desc': '',
    },
    'immersive-dark': {
        'en': False,
        'hero': ('夜色叙事', '沉浸式影像 · 2026'),
        'sections': [
            ('精选系列', '在光与暗的边界'),
            ('关于影棚', '十年情绪影像'),
            ('套系价格', '典藏拍摄方案'),
        ],
        'nav': ['作品集', '关于', '套系', '预约'],
        'items': ['情绪写真', '婚礼跟拍', '商业大片', '亲子', '旅拍', '纪念'],
        'prices': ['¥ 8,800', '¥ 16,800', '¥ 12,800'],
        'team_title': '主创团队', 'team_desc': '主理人 · 摄影师',
        'quote_title': '客户评价', 'quote_desc': '真实反馈',
        'footer_title': '联系我们', 'footer_desc': ''
    },
    'modern-gallery': {
        'en': False,
        'hero': ('生活即作品', '现代生活方式 · 2026'),
        'sections': [
            ('近期作品', '杂志级影像记录'),
            ('关于影棚', '自然光与真实感'),
            ('套餐一览', '轻盈之选'),
        ],
        'nav': ['作品集', '简介', '套餐', '咨询'],
        'items': ['人像写真', '亲子记录', '婚礼', '旅拍', '商业', '毕业季'],
        'prices': ['¥ 5,999', '¥ 9,999', '¥ 7,999'],
        'team_title': '拍摄团队', 'team_desc': '主理摄影师',
        'quote_title': '客户说', 'quote_desc': '来自真实评价',
        'footer_title': '找到我们', 'footer_desc': ''
    },
    # 内部兼容模板（internal: true），复用 editorial-gray 的英文调性文案
    'legacy-editorial-v3': {
        'en': True,
        'hero': ('Editorial Studio', 'PORTFOLIO 2026'),
        'sections': [
            ('Selected Works', 'A study in light and form'),
            ('About the Studio', 'Ten years of quiet portraits'),
            ('Packages', 'Collection offerings'),
        ],
        'nav': ['Selected', 'About', 'Services', 'Contact'],
        'items': ['Portrait', 'Wedding', 'Editorial', 'Family', 'Fashion', 'Maternity'],
        'prices': ['¥ 6,800', '¥ 12,000', '¥ 9,800'],
        'team_title': 'The Team', 'team_desc': 'Lead Photographer',
        'quote_title': 'Testimonials', 'quote_desc': 'Client feedback',
        'footer_title': 'Contact Us', 'footer_desc': '',
    },
}

# 灰阶图片占位：用主题主色做低饱和度的抽象色块，避免使用外部图片资源
def placeholder_svg(w, h, color, seed=0):
    """生成摄影图占位：柔和渐变 + 对角光带，暗示画面内容而非纯色块。"""
    import random
    rnd = random.Random(seed)
    bars = []
    for i in range(3):
        x = rnd.randint(-20, w)
        y = rnd.randint(0, h)
        sw = rnd.randint(w // 5, w // 2)
        sh = rnd.randint(h // 12, h // 4)
        op = round(rnd.uniform(0.05, 0.16), 3)
        bars.append(
            f'<rect x="{x}" y="{y}" width="{sw}" height="{sh}" fill="#ffffff" opacity="{op}" transform="rotate({rnd.randint(-25, 25)} {x} {y})"/>'
        )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">'
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0%" stop-color="{color}" stop-opacity="0.55"/>'
        f'<stop offset="100%" stop-color="{color}" stop-opacity="0.18"/></linearGradient></defs>'
        f'<rect width="{w}" height="{h}" fill="url(#g)"/>' + ''.join(bars) + '</svg>'
    )


def shift_hue(hexc, delta):
    """在 HSL 空间微调色相，让不同占位图有照片间的色调差异。"""
    import colorsys
    h = hexc.lstrip('#')
    if len(h) != 6:
        return hexc
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    hh, ll, ss = colorsys.rgb_to_hls(r, g, b)
    hh = (hh + delta / 360.0) % 1.0
    # 轻微提亮，避免占位图在浅色模板上过于沉闷
    ll = min(0.72, max(0.28, ll * 1.15))
    r2, g2, b2 = colorsys.hls_to_rgb(hh, ll, ss)
    return '#{:02x}{:02x}{:02x}'.format(int(r2 * 255), int(g2 * 255), int(b2 * 255))


def photo_tone(tokens):
    """挑选图片占位的主色：需与页面背景有足够对比，否则图块不可见。

    模板的 primaryColor 常常就是背景色本身（如 modern-gallery 的 #f5f5f4），
    直接使用会导致占位图"消失"。这里按亮度关系在候选色中挑一个最可辨识的。
    """
    bg = tokens.get('backgroundColor', '#ffffff')
    candidates = [
        tokens.get('accentColor'),
        tokens.get('primaryColor'),
        tokens.get('borderColor'),
        tokens.get('surfaceColor'),
        tokens.get('mutedTextColor')
    ]

    def lum(hexc):
        h = hexc.lstrip('#')
        if len(h) != 6:
            return 0.5
        r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    bg_l = lum(bg)
    best, best_diff = None, -1
    for c in candidates:
        if not c or not c.startswith('#'):
            continue
        diff = abs(lum(c) - bg_l)
        if diff > best_diff:
            best, best_diff = c, diff
    # 兜底：与背景对比过小时用中性灰
    return best if best_diff >= 0.12 else '#8a8f98'


def build_html(tpl_id, manifest, page_key, tokens):
    """按 tokens 还原该模板某页面的版面。"""
    c = COPY[tpl_id]
    bg = tokens.get('backgroundColor', '#ffffff')
    surface = tokens.get('surfaceColor', '#f7f5f2')
    text = tokens.get('textColor', '#1c1917')
    muted = tokens.get('mutedTextColor', '#78716c')
    border = tokens.get('borderColor', '#e7e5e4')
    accent = tokens.get('accentColor', '#111111')
    primary = tokens.get('primaryColor', '#94a3b8')
    tone = photo_tone(tokens)
    fonts = tokens.get('fontFamily', {})
    display = fonts.get('display', 'Georgia, serif')
    body = fonts.get('body', 'system-ui, sans-serif')
    spacing = tokens.get('spacing', {})
    radius = tokens.get('borderRadius', {})
    page_pad = spacing.get('page', 20)
    section_gap = spacing.get('section', 64)
    img_r = radius.get('image', 0)
    card_r = radius.get('card', 0)
    btn_style = tokens.get('buttonStyle', 'solid')
    is_dark = bg.lower() in ('#0f172a', '#000000', '#1e293b')

    img_r = f'{img_r}px'
    card_r = f'{card_r}px'

    if page_key == 'cover':
        # 封面：hero + 作品网格缩略
        title, sub = c['hero']
        blocks = []
        blocks.append(f'''
        <div style="height:400px;position:relative;overflow:hidden;border-radius:{img_r}">
          {placeholder_svg(1200, 400, shift_hue(tone, -8), seed=1).replace('<svg ', '<svg style="width:100%;height:100%;position:absolute;inset:0" ')}
          <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.05) 40%,rgba(0,0,0,0.55) 100%)"></div>
          <div style="position:absolute;left:64px;bottom:52px;color:#fff">
            <div style="font-family:{display};font-size:64px;line-height:1.05;letter-spacing:-1px">{title}</div>
            <div style="font-family:{body};font-size:20px;letter-spacing:6px;opacity:.82;margin-top:14px;text-transform:uppercase">{sub}</div>
          </div>
        </div>''')
        cols = ''.join(
            f'<div style="height:118px;position:relative;overflow:hidden;border-radius:{img_r}">'
            f'{placeholder_svg(300, 118, shift_hue(tone, i * 26 - 20), seed=i + 10).replace("<svg ", "<svg style=\'width:100%;height:100%;position:absolute;inset:0\' ")}'
            f'<div style="position:absolute;left:14px;bottom:11px;color:#fff;font-family:{body};font-size:16px;opacity:.9">{c["items"][i]}</div></div>'
            for i in range(3)
        )
        blocks.append(f'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:14px">{cols}</div>')
        return f'''
        <div style="width:1200px;padding:40px 64px;background:{bg};font-family:{body};color:{text}">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:28px">
            <div style="font-family:{display};font-size:26px">{manifest.get('displayName') or manifest.get('name')}</div>
            <div style="display:flex;gap:28px;font-size:16px;color:{muted}">
              {''.join(f'<span>{n}</span>' for n in c['nav'])}
            </div>
          </div>
          {''.join(blocks)}
        </div>'''

    # 页面预览：按 manifest 中该页面的真实区块序列渲染，保证每页视觉不同
    blocks = (manifest.get('pages', {}) or {}).get(page_key, {}).get('blocks', []) or []
    if not blocks:
        blocks = [{'type': 'hero'}, {'type': 'portfolio-grid'}, {'type': 'package-list'}]

    title, sub = c['hero']
    parts = []
    item_i = 0

    # 各区块类型的专属标题/副标题，避免同一页面出现重复标题
    HEAD = {
        'brand-intro': (c['sections'][1][0], c['sections'][1][1]),
        'team': (c.get('team_title', c['sections'][1][0]), c.get('team_desc', c['sections'][1][1])),
        'testimonials': (c.get('quote_title', c['sections'][1][0]), c.get('quote_desc', c['sections'][1][1])),
        'contact-footer': (c.get('footer_title', 'Contact Us'), c.get('footer_desc', '')),
    }

    for bi, blk in enumerate(blocks):
        btype = blk.get('type', '')
        gap = min(section_gap, 44)

        if btype == 'hero':
            hero_h = 300
            parts.append(f'''
            <div style="height:{hero_h}px;position:relative;overflow:hidden;border-radius:{img_r}">
              {placeholder_svg(750, hero_h, shift_hue(tone, -12), seed=2).replace('<svg ', '<svg style="width:100%;height:100%;position:absolute;inset:0" ')}
              <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.05) 35%,rgba(0,0,0,0.6) 100%)"></div>
              <div style="position:absolute;left:32px;bottom:28px;color:#fff">
                <div style="font-family:{display};font-size:38px;line-height:1.1">{title}</div>
                <div style="font-family:{body};font-size:14px;letter-spacing:4px;opacity:.8;margin-top:9px">{sub}</div>
              </div>
            </div>''')
            continue

        if btype in ('brand-intro', 'service-flow'):
            # 文字型区块
            sec_title, sec_desc = c['sections'][1]
            if btype == 'service-flow':
                steps = ''.join(
                    f'<div style="display:flex;gap:12px;align-items:flex-start">'
                    f'<div style="flex:0 0 22px;height:22px;border-radius:50%;background:{accent};color:#fff;'
                    f'display:flex;align-items:center;justify-content:center;font-family:{body};font-size:12px">{i + 1}</div>'
                    f'<div><div style="font-family:{body};font-size:15px;color:{text}">{c["items"][item_i % len(c["items"])]}</div>'
                    f'<div style="font-family:{body};font-size:13px;color:{muted};margin-top:3px">{sec_desc}</div></div></div>'
                    for i in range(3)
                )
                item_i += 3
                parts.append(f'''
                <div style="margin-top:{gap}px">
                  <div style="font-family:{display};font-size:24px">{sec_title}</div>
                  <div style="display:flex;flex-direction:column;gap:14px;margin-top:18px">{steps}</div>
                </div>''')
                continue
            parts.append(f'''
            <div style="margin-top:{gap}px;text-align:center">
              <div style="font-family:{display};font-size:26px">{sec_title}</div>
              <div style="font-family:{body};font-size:14px;color:{muted};margin-top:8px">{sec_desc}</div>
              <div style="margin-top:18px;font-family:{body};font-size:13px;color:{muted};line-height:1.85">
                {'<br/>'.join(['—— 影像是一种安静的叙事'] * 3)}
              </div>
            </div>''')
            continue

        if btype == 'category-nav':
            tabs = ''.join(
                f'<div style="font-family:{body};font-size:14px;color:{text};padding:9px 16px;'
                f'border:1px solid {border};border-radius:999px;background:{surface}">{c["items"][(item_i + i) % len(c["items"])]}</div>'
                for i in range(4)
            )
            item_i += 4
            parts.append(f'''
            <div style="margin-top:{gap}px;display:flex;gap:10px">{tabs}</div>''')
            continue

        if btype == 'package-list':
            sec_title, sec_desc = c['sections'][2]
            cards = ''
            for i, price in enumerate(c['prices']):
                btn_bg = accent if btn_style == 'solid' else 'transparent'
                btn_fg = '#ffffff' if btn_style == 'solid' else accent
                btn_bd = 'none' if btn_style == 'solid' else f'1px solid {accent}'
                cards += f'''
                <div style="background:{surface};border:1px solid {border};border-radius:{card_r};padding:16px">
                  <div style="font-family:{display};font-size:18px">{c['items'][item_i % len(c['items'])]}</div>
                  <div style="font-family:{body};font-size:17px;color:{accent};margin-top:8px">{price}</div>
                  <div style="margin-top:13px;display:inline-block;background:{btn_bg};color:{btn_fg};border:{btn_bd};border-radius:{radius.get('button', 4)}px;padding:8px 18px;font-family:{body};font-size:13px">预约</div>
                </div>'''
                item_i += 1
            parts.append(f'''
            <div style="margin-top:{gap}px">
              <div style="font-family:{display};font-size:24px">{sec_title}</div>
              <div style="font-family:{body};font-size:14px;color:{muted};margin-top:7px">{sec_desc}</div>
              <div style="display:flex;flex-direction:column;gap:11px;margin-top:16px">{cards}</div>
            </div>''')
            continue

        if btype == 'team':
            sec_title, sec_desc = HEAD['team']
            members = ''.join(
                f'<div style="text-align:center">'
                f'<div style="width:96px;height:96px;border-radius:50%;margin:0 auto;position:relative;overflow:hidden">'
                f'{placeholder_svg(96, 96, shift_hue(tone, (item_i + i) * 55 - 60), seed=item_i + i).replace("<svg ", "<svg style=\'width:100%;height:100%;position:absolute;inset:0\' ")}</div>'
                f'<div style="font-family:{body};font-size:14px;margin-top:10px">{c["items"][(item_i + i) % len(c["items"])]}</div>'
                f'<div style="font-family:{body};font-size:12px;color:{muted};margin-top:3px">{sec_desc}</div></div>'
                for i in range(3)
            )
            item_i += 3
            parts.append(f'''
            <div style="margin-top:{gap}px">
              <div style="font-family:{display};font-size:24px">{sec_title}</div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px">{members}</div>
            </div>''')
            continue

        if btype == 'testimonials':
            sec_title, sec_desc = HEAD['testimonials']
            quotes = ''.join(
                f'<div style="background:{surface};border:1px solid {border};border-radius:{card_r};padding:16px">'
                f'<div style="font-family:{display};font-size:15px;line-height:1.65;color:{text}">“{sec_desc}”</div>'
                f'<div style="font-family:{body};font-size:12px;color:{muted};margin-top:10px">— {c["items"][(item_i + i) % len(c["items"])]}</div></div>'
                for i in range(2)
            )
            item_i += 2
            parts.append(f'''
            <div style="margin-top:{gap}px">
              <div style="font-family:{display};font-size:24px">{sec_title}</div>
              <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px">{quotes}</div>
            </div>''')
            continue

        if btype == 'contact-footer':
            sec_title, sec_desc = HEAD['contact-footer']
            parts.append(f'''
            <div style="margin-top:{gap}px;background:{surface};border-radius:{card_r};padding:22px">
              <div style="font-family:{display};font-size:20px">{sec_title}</div>
              <div style="font-family:{body};font-size:13px;color:{muted};margin-top:9px;line-height:1.8">
                地址：XX 市 XX 区 XX 路 88 号<br/>预约：400-000-0000<br/>邮箱：studio@example.com
              </div>
            </div>''')
            continue

        if btype == 'series-gallery':
            sec_title, sec_desc = c['sections'][0]
            grid = ''.join(
                f'<div style="height:210px;position:relative;overflow:hidden;border-radius:{img_r}">'
                f'{placeholder_svg(350, 210, shift_hue(tone, (item_i + i) * 29 - 35), seed=item_i + i).replace("<svg ", "<svg style=\'width:100%;height:100%;position:absolute;inset:0\' ")}'
                f'<div style="position:absolute;left:12px;bottom:9px;color:#fff;font-family:{body};font-size:14px;opacity:.92">{c["items"][(item_i + i) % len(c["items"])]}</div></div>'
                for i in range(2)
            )
            item_i += 2
            parts.append(f'''
            <div style="margin-top:{gap}px">
              <div style="font-family:{display};font-size:24px">{sec_title}</div>
              <div style="font-family:{body};font-size:14px;color:{muted};margin-top:7px">{sec_desc}</div>
              <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px">{grid}</div>
            </div>''')
            continue

        # portfolio-grid 及其它图片网格区块
        sec_title, sec_desc = c['sections'][0]
        grid = ''.join(
            f'<div style="height:170px;position:relative;overflow:hidden;border-radius:{img_r}">'
            f'{placeholder_svg(350, 170, shift_hue(tone, (item_i + i) * 23 - 30), seed=item_i + i).replace("<svg ", "<svg style=\'width:100%;height:100%;position:absolute;inset:0\' ")}'
            f'<div style="position:absolute;left:12px;bottom:9px;color:#fff;font-family:{body};font-size:14px;opacity:.92">{c["items"][(item_i + i) % len(c["items"])]}</div></div>'
            for i in range(4)
        )
        item_i += 4
        parts.append(f'''
        <div style="margin-top:{gap}px">
          <div style="font-family:{display};font-size:24px">{sec_title}</div>
          <div style="font-family:{body};font-size:14px;color:{muted};margin-top:7px">{sec_desc}</div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px">{grid}</div>
        </div>''')

    nav_active = {'portfolio': 0, 'series': 0, 'about': 1, 'packages': 2}.get(page_key, 0)
    nav = ''.join(
        f'<div style="font-family:{body};font-size:13px;color:{accent if i == nav_active else muted};'
        f'font-weight:{600 if i == nav_active else 400}">{n}</div>'
        for i, n in enumerate(c['nav'])
    )
    return f'''
    <div style="width:750px;background:{bg};color:{text};font-family:{body}">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:{page_pad}px {page_pad + 12}px 0">
        <div style="font-family:{display};font-size:19px">{manifest.get('displayName') or manifest.get('name')}</div>
        <div style="display:flex;gap:16px">{nav}</div>
      </div>
      <div style="padding:0 {page_pad + 12}px {page_pad + 12}px">{''.join(parts)}</div>
    </div>'''


def main():
    from playwright.sync_api import sync_playwright

    targets = []
    for entry in sorted(os.listdir(TEMPLATES_DIR)):
        tdir = os.path.join(TEMPLATES_DIR, entry)
        if not os.path.isdir(tdir):
            continue
        mpath = os.path.join(tdir, 'manifest.json')
        if not os.path.exists(mpath):
            continue
        with open(mpath, encoding='utf-8') as f:
            manifest = json.load(f)
        if not manifest.get('preview'):
            continue
        targets.append((entry, manifest))

    if not targets:
        print('没有需要生成预览图的模板')
        return 1

    written = 0
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for tpl_id, manifest in targets:
            tokens = manifest.get('tokens', {})
            out_dir = os.path.join(TEMPLATES_DIR, tpl_id)
            jobs = [('cover', 'preview-cover.jpg', COVER_SIZE)]
            for page_key in (manifest.get('preview', {}).get('pages') or {}):
                jobs.append((page_key, f'preview-{page_key}.jpg', PAGE_SIZE))

            for page_key, filename, (w, h) in jobs:
                html = build_html(tpl_id, manifest, page_key, tokens)
                page = browser.new_page(viewport={'width': w, 'height': h}, device_scale_factor=2)
                page.set_content(
                    f'<html><head><meta charset="utf-8"><style>*{{margin:0;padding:0;box-sizing:border-box}}'
                    f'body{{background:{tokens.get("backgroundColor", "#fff")}}}'
                    f'.ph{{width:{w}px;overflow:hidden}}</style></head>'
                    f'<body><div class="ph">{html}</div></body></html>'
                )
                page.wait_for_timeout(180)
                # 内容高度自适应：以实际渲染高度为准，避免区块被裁切
                content_h = page.evaluate('document.querySelector(".ph").scrollHeight')
                shot_h = min(max(int(content_h), 320), 1800)
                page.set_viewport_size({'width': w, 'height': shot_h})
                page.wait_for_timeout(120)
                out = os.path.join(out_dir, filename)
                page.screenshot(path=out, type='jpeg', quality=82, clip={'x': 0, 'y': 0, 'width': w, 'height': shot_h})
                page.close()
                written += 1
                print(f'  ✓ {tpl_id}/{filename}  ({w}x{shot_h})')
        browser.close()

    print(f'\n共生成 {written} 张预览图')
    return 0


if __name__ == '__main__':
    sys.exit(main())
