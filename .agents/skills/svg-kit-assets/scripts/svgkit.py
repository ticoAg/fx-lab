"""Drawing helpers for fx-lab SVG kits (80x80, transparent, currentColor outlines).

Import from a per-theme generator kept outside the repo, for example /tmp/fx-lab-<theme>-work/draw.py:

    import sys; sys.path.insert(0, '.agents/skills/svg-kit-assets/scripts')  # fx-lab repo root
    from svgkit import *

    def barn(I):                      # I = Icon('pastoral', 'barn')
        walls = I.shape('M15 70 V43 L40 23 L65 43 V70Z', '#BF5340', sh('M52 20 H70 V72 H56Z', '#97402F', .55))
        return shadow(40, 72, 24), moving(I, walls)   # static parts, then the one animated group

    svg = render(I, meta_icon, static + anim, 'pulse', origin=(40, 46), dur=3.2, amp=1.025)

Conventions the validators enforce:
- ids, classes and @keyframes start with '<theme>-<icon>-'. Icon.pid() and motion_css() do this.
- exactly one element carries class '<theme>-<icon>-motion' (use moving()); its kind matches the manifest.
- outlines use stroke="currentColor"; fills are fixed colors, never currentColor.
"""
import math

SW = 2.4
EYE = '#3A2C22'


def f(v):
    s = f'{v:.1f}'
    return s[:-2] if s.endswith('.0') else s


class Icon:
    def __init__(self, theme, iid):
        self.theme, self.id, self.defs, self.n = theme, iid, [], 0

    @property
    def prefix(self):
        return f'{self.theme}-{self.id}-'

    def pid(self):
        self.n += 1
        return f'{self.prefix}{self.n}'

    def shape(self, geom, fill, shade='', sw=SW, tag='path'):
        """Fill, then shading clipped to the same shape, then the currentColor outline on top.

        geom is path data for tag='path', otherwise an attribute string such as 'cx="40" cy="30" r="9"'.
        """
        i = self.pid()
        self.defs.append(f'<path id="{i}" d="{geom}"/>' if tag == 'path' else f'<{tag} id="{i}" {geom}/>')
        out = f'<use href="#{i}" fill="{fill}"/>'
        if shade:
            self.defs.append(f'<clipPath id="{i}c"><use href="#{i}"/></clipPath>')
            out += f'<g clip-path="url(#{i}c)">{shade}</g>'
        if sw:
            out += f'<use href="#{i}" fill="none" stroke="currentColor" stroke-width="{f(sw)}"/>'
        return out


def _op(op):
    return f' opacity="{op}"' if op is not None else ''


def sh(d, fill, op=None):
    """Unstroked shade or tint patch, normally passed as Icon.shape(shade=...)."""
    return f'<path d="{d}" fill="{fill}"{_op(op)}/>'


def ln(d, color, w=1.2, op=None, dash=None):
    da = f' stroke-dasharray="{dash}"' if dash else ''
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{f(w)}"{_op(op)}{da}/>'


def hl(d, w=1.6, op=0.7):
    """White highlight stroke (light comes from the upper left)."""
    return ln(d, '#FFFFFF', w, op)


def ink(d, w=1.4):
    return f'<path d="{d}" fill="none" stroke="currentColor" stroke-width="{f(w)}"/>'


def _stroke(w):
    return f' stroke="currentColor" stroke-width="{f(w)}"' if w else ''


def path(d, fill, w=1.4):
    return f'<path d="{d}" fill="{fill}"{_stroke(w)}/>'


def circ(cx, cy, r, fill, w=1.4):
    return f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{fill}"{_stroke(w)}/>'


def ell(cx, cy, rx, ry, fill, w=1.4, rot=None):
    t = f' transform="rotate({f(rot)} {f(cx)} {f(cy)})"' if rot else ''
    return f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"{_stroke(w)}{t}/>'


def tube(d, color, w=3.0):
    """Outlined stroke (handles, stems, poles): a currentColor stroke under a narrower colored one."""
    return ink(d, w + 2.6) + ln(d, color, w)


def eye(cx, cy, r=2.2, color=EYE):
    """Fixed dark pupil with a glint. Not currentColor, which would turn eyes pale on dark pages."""
    return circ(cx, cy, r, color, 0) + circ(cx + r * 0.38, cy - r * 0.38, r * 0.36, '#FFFFFF', 0)


def shadow(cx, cy, rx, ry=2.4, color='#4B3A2A'):
    return f'<ellipse cx="{f(cx)}" cy="{f(cy)}" rx="{f(rx)}" ry="{f(ry)}" fill="{color}" opacity=".16"/>'


def scallop(cx, cy, rx, ry, n, bulge=0.62, phase=-90):
    """Closed cloud/wool/canopy outline of n outward arcs around an ellipse."""
    pts = [(cx + rx * math.cos(math.radians(phase + 360 * k / n)), cy + ry * math.sin(math.radians(phase + 360 * k / n)))
           for k in range(n)]
    d = f'M{f(pts[0][0])} {f(pts[0][1])}'
    for k in range(1, n + 1):
        (x0, y0), (x1, y1) = pts[k - 1], pts[k % n]
        r = math.hypot(x1 - x0, y1 - y0) * bulge
        d += f' A{f(r)} {f(r)} 0 0 1 {f(x1)} {f(y1)}'
    return d + 'Z'


def flower(cx, cy, r, petal, center, n=5):
    out = ''.join(ell(cx, cy - r, r * 0.62, r, petal, 1).replace('/>', f' transform="rotate({f(360 * k / n)} {f(cx)} {f(cy)})"/>')
                  for k in range(n))
    return out + circ(cx, cy, r * 0.62, center, 1)


FRAMES = {
    'float': lambda a: f'0%,100%{{transform:translateY(0)}}50%{{transform:translateY(-{a}px)}}',
    'sway': lambda a: f'0%,100%{{transform:rotate(-{a}deg)}}50%{{transform:rotate({a}deg)}}',
    'spin': lambda a: 'to{transform:rotate(360deg)}',
    'pulse': lambda a: f'0%,100%{{transform:scale(1)}}50%{{transform:scale({a})}}',
    'pop': lambda a: (f'0%,62%,100%{{transform:translateY(0) scale(1)}}72%{{transform:translateY(-{a}px) scale(1.025)}}'
                      f'82%{{transform:translateY(0) scale(.985,1.01)}}90%{{transform:translateY(0) scale(1.005)}}'),
}


def motion_css(I, kind, origin, dur, amp):
    """Scoped CSS: pause inheritance chain, one motion class, one @keyframes, reduced-motion off switch.

    amp: px for float/pop, degrees for sway, scale factor for pulse, ignored for spin.
    origin: pivot in viewBox units (transform-box:view-box), e.g. the hub of a spinning part.
    """
    root, cls, kf = f'#{I.prefix}root', f'{I.prefix}motion', f'{I.prefix}{kind}'
    css = f'{root},{root} g{{animation-play-state:inherit}}'
    if kind == 'none':
        return css
    timing = 'linear' if kind == 'spin' else 'ease-in-out'
    return (css + f'.{cls}{{animation:{kf} {dur}s {timing} infinite;animation-play-state:inherit;'
            f'transform-box:view-box;transform-origin:{f(origin[0])}px {f(origin[1])}px}}'
            f'@keyframes {kf}{{{FRAMES[kind](amp)}}}'
            f'@media (prefers-reduced-motion:reduce){{.{cls}{{animation:none!important;transform:none!important}}}}')


def moving(I, inner):
    return f'<g class="{I.prefix}motion">{inner}</g>'


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def render(I, meta, body, kind, origin=(40, 40), dur=3.2, amp=2):
    """Full SVG file. meta is the manifest icon entry (title/description in zh and en)."""
    label = esc(f'{meta["title"]["en"]} / {meta["title"]["zh"]}')
    desc = esc(f'{meta["description"]["en"]} / {meta["description"]["zh"]}')
    defs = f'<defs>{"".join(I.defs)}</defs>' if I.defs else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" id="{I.prefix}root" viewBox="0 0 80 80" role="img" '
            f'aria-label="{label}" stroke-linecap="round" stroke-linejoin="round"><title>{label}</title>'
            f'<desc>{desc}</desc><style>{motion_css(I, kind, origin, dur, amp)}</style>{defs}{body}</svg>')
