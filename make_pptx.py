#!/usr/bin/env python3
"""
Generate a professional GTU Summer Internship Presentation (.pptx)
for Ansh Patel — Intern at Metanoia Solutions
Project: Disaster Relief Coordination Platform
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt, Cm, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import math

# ── Configuration ──────────────────────────────────────────────────────────────
STUDENT_NAME     = "Ansh Patel"
COLLEGE_NAME     = "C. K. Pithawala College of Engineering and Technology"
DEPARTMENT       = "Information Technology"
UNIVERSITY       = "Gujarat Technological University"
COMPANY_NAME     = "Metanoia Solutions"
COMPANY_WEBSITE  = "metanoiasolution.com"
MENTOR_NAME      = "Nehal Patel"
DESIGNATION      = "Web Developer Intern"
INTERN_DURATION  = "January 2026 – June 2026"
PROJECT_TITLE    = "Disaster Relief Coordination Platform"
FACULTY_GUIDE    = "[Faculty Guide Name]"

OUT_DIR  = r"C:\Disaster Relief Coordination Platform"
OUT_FILE = os.path.join(OUT_DIR, "Internship_Presentation.pptx")

# ── Colors ─────────────────────────────────────────────────────────────────────
WHITE       = RGBColor(0xFF, 0xFF, 0xFF)
BLACK       = RGBColor(0x00, 0x00, 0x00)
NAVY        = RGBColor(0x00, 0x2B, 0x5E)
DARK_BLUE   = RGBColor(0x00, 0x3D, 0x7A)
ACCENT_BLUE = RGBColor(0x00, 0x70, 0xC0)
LIGHT_BLUE  = RGBColor(0xD6, 0xE8, 0xFA)
MED_BLUE    = RGBColor(0x4A, 0x90, 0xD9)
SOFT_BLUE   = RGBColor(0xE8, 0xF0, 0xFE)
DARK_GRAY   = RGBColor(0x33, 0x33, 0x33)
MED_GRAY    = RGBColor(0x66, 0x66, 0x66)
LIGHT_GRAY  = RGBColor(0xF0, 0xF2, 0xF5)
GREEN       = RGBColor(0x10, 0xB9, 0x81)
RED         = RGBColor(0xEF, 0x44, 0x44)
ORANGE      = RGBColor(0xF0, 0x92, 0x0A)
TEAL        = RGBColor(0x0E, 0xA5, 0x9E)
PURPLE      = RGBColor(0x8B, 0x5C, 0xF6)
PINK        = RGBColor(0xE8, 0x4D, 0x8A)
YELLOW      = RGBColor(0xF9, 0xC7, 0x4F)

# Card colors
CARD_COLORS = [RGBColor(0x00, 0x70, 0xC0), RGBColor(0x10, 0xB9, 0x81),
               RGBColor(0xEF, 0x44, 0x44), RGBColor(0xF0, 0x92, 0x0A),
               RGBColor(0x8B, 0x5C, 0xF6), RGBColor(0x0E, 0xA5, 0x9E),
               RGBColor(0xE8, 0x4D, 0x8A), RGBColor(0x00, 0x2B, 0x5E),
               RGBColor(0x6B, 0x72, 0x80), RGBColor(0x3B, 0x82, 0xF6)]

MODULE_ICONS = ["🔐","🆘","🌊","🤝","📦","🏠","📊","⚙️","🔔","🗺️"]

# ── Presentation Setup ─────────────────────────────────────────────────────────
prs = Presentation()
prs.slide_width  = Inches(13.333)
prs.slide_height = Inches(7.5)

SW = prs.slide_width
SH = prs.slide_height

# ── Helper Functions ───────────────────────────────────────────────────────────

def add_bg_rect(slide, color=DARK_BLUE, left=0, top=0, width=None, height=None):
    """Add a filled rectangle background."""
    w = width or SW
    h = height or SH
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, w, h)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    shape.shadow.inherit = False
    return shape

def add_accent_bar(slide, left=0, top=0, width=Inches(0.08), height=Inches(0.6), color=ACCENT_BLUE):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_textbox(slide, left, top, width, height, text="", font_size=18,
                bold=False, color=BLACK, align=PP_ALIGN.LEFT, font_name="Calibri",
                italic=False, anchor=MSO_ANCHOR.TOP):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    txBox.word_wrap = True
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    try:
        tf.vertical_anchor = anchor
    except:
        pass
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.bold = bold
    p.font.color.rgb = color
    p.font.name = font_name
    p.alignment = align
    if italic:
        p.font.italic = True
    return txBox

def add_multiline_textbox(slide, left, top, width, height, lines, font_size=16,
                           color=BLACK, align=PP_ALIGN.LEFT, font_name="Calibri",
                           line_spacing=1.2, anchor=MSO_ANCHOR.TOP):
    txBox = slide.shapes.add_textbox(left, top, width, height)
    txBox.word_wrap = True
    tf = txBox.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    try:
        tf.vertical_anchor = anchor
    except:
        pass
    for i, (txt, sz, bld, clr) in enumerate(lines):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = txt
        p.font.size = Pt(sz)
        p.font.bold = bld
        p.font.color.rgb = clr
        p.font.name = font_name
        p.alignment = align
        p.space_after = Pt(4)
    return txBox

def add_rounded_rect(slide, left, top, width, height, fill_color, border_color=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    if border_color:
        shape.line.color.rgb = border_color
        shape.line.width = Pt(1.5)
    else:
        shape.line.fill.background()
    return shape

def add_circle(slide, left, top, size, fill_color):
    shape = slide.shapes.add_shape(MSO_SHAPE.OVAL, left, top, size, size)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    return shape

def add_arrow_right(slide, left, top, width, height, color=MED_GRAY):
    shape = slide.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()
    return shape

def add_chevron(slide, left, top, width, height, fill_color):
    shape = slide.shapes.add_shape(MSO_SHAPE.CHEVRON, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill_color
    shape.line.fill.background()
    return shape

def add_shadow(shape):
    """Add a subtle shadow to a shape."""
    from pptx.oxml.ns import qn
    spPr = shape._element.spPr
    shadow_elem = spPr.makeelement(qn('a:effectLst'), {})
    # Outer shadow
    outerShdw = shadow_elem.makeelement(qn('a:outerShdw'), {
        'blurRad': '40000', 'dist': '20000', 'dir': '2700000',
        'algn': 'tl', 'rotWithShape': '0'
    })
    srgbClr = outerShdw.makeelement(qn('a:srgbClr'), {'val': '000000'})
    alpha = outerShdw.makeelement(qn('a:alpha'), {'val': '15000'})
    srgbClr.append(alpha)
    outerShdw.append(srgbClr)
    shadow_elem.append(outerShdw)
    spPr.append(shadow_elem)

def add_gradient_bg(slide, color1=DARK_BLUE, color2=NAVY):
    """Add a gradient rectangle background."""
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, SH)
    shape.line.fill.background()
    shape.fill.gradient()
    # Gradient stops
    from pptx.oxml.ns import qn
    from lxml import etree
    gsLst = shape.fill._gradient_stops
    stop1 = etree.SubElement(gsLst, qn('a:gs'), {'pos': '0'})
    cls1 = etree.SubElement(stop1, qn('a:srgbClr'), {'val': '%02X%02X%02X' % (color1[0] if hasattr(color1,'__iter__') else color1.red, color1.green if hasattr(color1,'__iter__') else 0, color1.blue if hasattr(color1,'__iter__') else 0) if isinstance(color1, RGBColor) else '002B5E'})
    # Simpler approach - just use solid
    shape.fill.solid()
    shape.fill.fore_color.rgb = color1
    return shape

def add_icon_circle(slide, left, top, size, icon_text, bg_color, icon_color=WHITE, font_size=20):
    """Add a circle with an icon character in it."""
    shape = add_circle(slide, left, top, size, bg_color)
    add_shadow(shape)
    # Text on top
    txBox = slide.shapes.add_textbox(left, top, size, size)
    tf = txBox.text_frame
    tf.word_wrap = True
    try:
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    except:
        pass
    p = tf.paragraphs[0]
    p.text = icon_text
    p.font.size = Pt(font_size)
    p.font.color.rgb = icon_color
    p.font.name = "Segoe UI Emoji"
    p.alignment = PP_ALIGN.CENTER
    return shape

def add_card(slide, left, top, width, height, title, content, 
             card_color=WHITE, title_color=DARK_BLUE, content_color=DARK_GRAY,
             accent_top=True):
    """Add a professional card with optional top accent bar."""
    shape = add_rounded_rect(slide, left, top, width, height, card_color)
    add_shadow(shape)
    if accent_top:
        bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left + Inches(0.1), top,
                                      width - Inches(0.2), Inches(0.06))
        bar.fill.solid()
        bar.fill.fore_color.rgb = ACCENT_BLUE
        bar.line.fill.background()
    # Title
    add_textbox(slide, left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), Inches(0.4),
                title, font_size=14, bold=True, color=title_color)
    # Content
    add_textbox(slide, left + Inches(0.25), top + Inches(0.55), width - Inches(0.5), height - Inches(0.7),
                content, font_size=11, color=content_color)
    return shape

def add_table(slide, left, top, width, height, headers, rows, col_widths=None):
    """Add a styled table."""
    n_rows = len(rows) + 1
    n_cols = len(headers)
    table_shape = slide.shapes.add_table(n_rows, n_cols, left, top, width, height)
    table = table_shape.table
    
    if col_widths:
        for i, w in enumerate(col_widths):
            table.columns[i].width = w
    
    # Header
    for ci, header in enumerate(headers):
        cell = table.cell(0, ci)
        cell.text = ""
        p = cell.text_frame.paragraphs[0]
        p.text = header
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.font.name = "Calibri"
        p.alignment = PP_ALIGN.CENTER
        # Background
        tcPr = cell._tc.get_or_add_tcPr()
        solidFill = tcPr.makeelement('{http://schemas.openxmlformats.org/drawingml/2006/main}solidFill', {})
        srgbClr = solidFill.makeelement('{http://schemas.openxmlformats.org/drawingml/2006/main}srgbClr', {'val': '002B5E'})
        solidFill.append(srgbClr)
        tcPr.append(solidFill)
    
    # Data rows
    for ri, row_data in enumerate(rows):
        for ci, val in enumerate(row_data):
            cell = table.cell(ri + 1, ci)
            cell.text = ""
            p = cell.text_frame.paragraphs[0]
            p.text = str(val)
            p.font.size = Pt(10)
            p.font.name = "Calibri"
            p.alignment = PP_ALIGN.CENTER if ci > 0 else PP_ALIGN.LEFT
            # Alternate row shading
            if ri % 2 == 1:
                tcPr = cell._tc.get_or_add_tcPr()
                solidFill = tcPr.makeelement('{http://schemas.openxmlformats.org/drawingml/2006/main}solidFill', {})
                srgbClr = solidFill.makeelement('{http://schemas.openxmlformats.org/drawingml/2006/main}srgbClr', {'val': 'E8F0FE'})
                solidFill.append(srgbClr)
                tcPr.append(solidFill)
    
    return table_shape


# ==============================================================================
# SLIDE 1 — PROFESSIONAL COVER PAGE
# ==============================================================================
slide1 = prs.slides.add_slide(prs.slide_layouts[6])  # Blank

# Dark blue gradient background
bg1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, SH)
bg1.fill.solid()
bg1.fill.fore_color.rgb = NAVY
bg1.line.fill.background()

# Decorative geometric elements
# Large circle top-right
circ1 = slide1.shapes.add_shape(MSO_SHAPE.OVAL, Inches(9.5), Inches(-1.5), Inches(5.5), Inches(5.5))
circ1.fill.solid()
circ1.fill.fore_color.rgb = RGBColor(0x00, 0x3D, 0x7A)
circ1.line.fill.background()

circ2 = slide1.shapes.add_shape(MSO_SHAPE.OVAL, Inches(-1.5), Inches(4.5), Inches(4), Inches(4))
circ2.fill.solid()
circ2.fill.fore_color.rgb = RGBColor(0x00, 0x3D, 0x7A)
circ2.line.fill.background()

# Left accent bar
add_bg_rect(slide1, ACCENT_BLUE, Inches(0.5), Inches(0), Inches(0.06), SH)

# College / University info
add_textbox(slide1, Inches(1.2), Inches(0.6), Inches(8), Inches(0.4),
            UNIVERSITY, font_size=13, bold=True, color=MED_BLUE, 
            font_name="Calibri")

add_textbox(slide1, Inches(1.2), Inches(1.0), Inches(8), Inches(0.4),
            COLLEGE_NAME, font_size=15, bold=True, color=WHITE)

# Separator line
sep = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.2), Inches(1.5), Inches(2.5), Inches(0.04))
sep.fill.solid()
sep.fill.fore_color.rgb = ACCENT_BLUE
sep.line.fill.background()

# Internship report label
add_textbox(slide1, Inches(1.2), Inches(1.7), Inches(8), Inches(0.5),
            "INTERNSHIP PRESENTATION", font_size=20, bold=True, color=ACCENT_BLUE)

# Project Title
add_textbox(slide1, Inches(1.2), Inches(2.3), Inches(10), Inches(1.2),
            PROJECT_TITLE, font_size=36, bold=True, color=WHITE)

# Project Tagline
add_textbox(slide1, Inches(1.2), Inches(3.4), Inches(8), Inches(0.5),
            "A Full-Stack Government Disaster Management Web Application", 
            font_size=16, color=RGBColor(0xBB, 0xCC, 0xEE))

# Student Details section
add_textbox(slide1, Inches(1.2), Inches(4.3), Inches(5), Inches(0.4),
            "Presented by:", font_size=12, bold=True, color=MED_BLUE)

add_textbox(slide1, Inches(1.2), Inches(4.7), Inches(5), Inches(0.4),
            STUDENT_NAME, font_size=20, bold=True, color=WHITE)

add_textbox(slide1, Inches(1.2), Inches(5.1), Inches(5), Inches(0.4),
            f"{DEPARTMENT} | {DESIGNATION}", font_size=13, color=RGBColor(0xBB, 0xCC, 0xEE))

# Bottom details
# Mentor
add_textbox(slide1, Inches(1.2), Inches(5.8), Inches(5), Inches(0.35),
            f"Industry Mentor: {MENTOR_NAME}", font_size=12, color=RGBColor(0xAA, 0xBB, 0xDD))
add_textbox(slide1, Inches(1.2), Inches(6.1), Inches(5), Inches(0.35),
            f"Faculty Guide: {FACULTY_GUIDE}", font_size=12, color=RGBColor(0xAA, 0xBB, 0xDD))
add_textbox(slide1, Inches(1.2), Inches(6.4), Inches(5), Inches(0.35),
            f"Internship Duration: {INTERN_DURATION}", font_size=12, color=RGBColor(0xAA, 0xBB, 0xDD))

# Company info - right side
add_textbox(slide1, Inches(8.5), Inches(4.3), Inches(4), Inches(0.4),
            "In Association With", font_size=11, bold=True, color=MED_BLUE, align=PP_ALIGN.RIGHT)

add_textbox(slide1, Inches(8.5), Inches(4.7), Inches(4), Inches(0.4),
            COMPANY_NAME, font_size=18, bold=True, color=WHITE, align=PP_ALIGN.RIGHT)

add_textbox(slide1, Inches(8.5), Inches(5.1), Inches(4), Inches(0.3),
            COMPANY_WEBSITE, font_size=11, color=MED_BLUE, align=PP_ALIGN.RIGHT)

# Logo placeholders - bottom right
# College logo placeholder (square)
logo1 = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(8.8), Inches(0.5), Inches(1.6), Inches(1.6))
logo1.fill.solid()
logo1.fill.fore_color.rgb = RGBColor(0x00, 0x35, 0x6E)
logo1.line.color.rgb = MED_BLUE
logo1.line.width = Pt(1)
add_textbox(slide1, Inches(8.8), Inches(1.0), Inches(1.6), Inches(0.6),
            "🏛️\nCollege\nLogo", font_size=9, color=RGBColor(0xAA, 0xCC, 0xEE), 
            align=PP_ALIGN.CENTER)

# Company logo placeholder
logo2 = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(10.8), Inches(0.5), Inches(1.6), Inches(1.6))
logo2.fill.solid()
logo2.fill.fore_color.rgb = RGBColor(0x00, 0x35, 0x6E)
logo2.line.color.rgb = MED_BLUE
logo2.line.width = Pt(1)
add_textbox(slide1, Inches(10.8), Inches(1.0), Inches(1.6), Inches(0.6),
            "🏢\nCompany\nLogo", font_size=9, color=RGBColor(0xAA, 0xCC, 0xEE), 
            align=PP_ALIGN.CENTER)

# Bottom decorative line
bot_line = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(7.2), SW, Inches(0.3))
bot_line.fill.solid()
bot_line.fill.fore_color.rgb = RGBColor(0x00, 0x35, 0x6E)
bot_line.line.fill.background()


# ==============================================================================
# SLIDE 2 — OUTLINE / TABLE OF CONTENTS
# ==============================================================================
slide2 = prs.slides.add_slide(prs.slide_layouts[6])

# White background
add_bg_rect(slide2, WHITE)

# Top header bar
add_bg_rect(slide2, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide2, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Presentation Outline", font_size=28, bold=True, color=WHITE)
add_textbox(slide2, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "Journey through the internship experience", font_size=13, color=MED_BLUE)

# SmartArt-style grid of outline items using colored circles connected
outline_items = [
    ("01", "Company\nProfile", ACCENT_BLUE),
    ("02", "Technology\nStack", GREEN),
    ("03", "Internship\nObjectives", ORANGE),
    ("04", "Project\nOverview", RED),
    ("05", "System\nArchitecture", PURPLE),
    ("06", "Major\nModules", TEAL),
    ("07", "Work\nPerformed", PINK),
    ("08", "Implement-\ntation", ACCENT_BLUE),
    ("09", "Testing", GREEN),
    ("10", "Results &\nAchievements", ORANGE),
    ("11", "Learning\nOutcomes", RED),
    ("12", "Challenges &\nSolutions", PURPLE),
    ("13", "Future\nScope", TEAL),
    ("14", "Conclusion", PINK),
]

start_x = Inches(0.6)
start_y = Inches(1.6)
box_w = Inches(1.6)
box_h = Inches(1.6)
gap_x = Inches(0.25)
gap_y = Inches(0.25)

for idx, (num, label, color) in enumerate(outline_items):
    col = idx % 7
    row = idx // 7
    x = start_x + col * (box_w + gap_x)
    y = start_y + row * (box_h + gap_y)
    
    # Card background
    card = add_rounded_rect(slide2, x, y, box_w, box_h, SOFT_BLUE, LIGHT_BLUE)
    
    # Number circle
    circle_size = Inches(0.45)
    cx = x + (box_w - circle_size) / 2
    cy = y + Inches(0.2)
    add_circle(slide2, cx, cy, circle_size, color)
    add_textbox(slide2, cx, cy + Inches(0.05), circle_size, circle_size,
                num, font_size=12, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    
    # Label
    add_textbox(slide2, x + Inches(0.1), y + Inches(0.75), box_w - Inches(0.2), Inches(0.7),
                label, font_size=10, color=DARK_GRAY, align=PP_ALIGN.CENTER)

# Bottom accent line
bot_acc = slide2.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(7.3), SW, Inches(0.15))
bot_acc.fill.solid()
bot_acc.fill.fore_color.rgb = ACCENT_BLUE
bot_acc.line.fill.background()


# ==============================================================================
# SLIDE 3 — COMPANY PROFILE
# ==============================================================================
slide3 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide3, WHITE)
add_bg_rect(slide3, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide3, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Company Profile", font_size=28, bold=True, color=WHITE)
add_textbox(slide3, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            COMPANY_NAME + " — Empowering Businesses Through Technology", 
            font_size=13, color=MED_BLUE)

# Left side - About the company
add_textbox(slide3, Inches(0.6), Inches(1.5), Inches(6), Inches(0.4),
            "🔷 About the Company", font_size=16, bold=True, color=NAVY)

about_text = (f"{COMPANY_NAME} is a dynamic IT services and consulting company "
              "headquartered in Surat, Gujarat. With over 7+ years of experience, "
              "the company has successfully delivered 25+ projects for 19+ organizations "
              "across diverse domains including healthcare, education, e-commerce, and government.")
add_textbox(slide3, Inches(0.6), Inches(1.9), Inches(5.8), Inches(1.8),
            about_text, font_size=11, color=DARK_GRAY)

# Mission & Vision cards
card_w = Inches(2.8)
card_h = Inches(1.5)

# Mission card
mc1 = add_rounded_rect(slide3, Inches(0.6), Inches(3.8), card_w, card_h, SOFT_BLUE, LIGHT_BLUE)
add_textbox(slide3, Inches(0.8), Inches(3.9), card_w - Inches(0.4), Inches(0.3),
            "🎯 Mission", font_size=13, bold=True, color=NAVY)
add_textbox(slide3, Inches(0.8), Inches(4.2), card_w - Inches(0.4), Inches(1.0),
            "Transform manual processes into efficient, scalable, automated digital systems for startups and SMEs.",
            font_size=10, color=DARK_GRAY)

# Vision card
mc2 = add_rounded_rect(slide3, Inches(3.6), Inches(3.8), card_w, card_h, SOFT_BLUE, LIGHT_BLUE)
add_textbox(slide3, Inches(3.8), Inches(3.9), card_w - Inches(0.4), Inches(0.3),
            "👁️ Vision", font_size=13, bold=True, color=NAVY)
add_textbox(slide3, Inches(3.8), Inches(4.2), card_w - Inches(0.4), Inches(1.0),
            "Be a leading technology partner driving digital transformation through innovation and quality.",
            font_size=10, color=DARK_GRAY)

# Right side - Key Info Cards
info_items = [
    ("🌐", "Services", "Web Dev, Mobile Apps,\nUI/UX, Cloud, AI"),
    ("👥", "Clients", "19+ Organizations\nAcross Industries"),
    ("💻", "Technologies", "MERN, Flutter, Laravel,\nPython, Docker"),
    ("📍", "Office", "Surat, Gujarat, India"),
]

info_start_y = Inches(1.5)
for i, (icon, label, desc) in enumerate(info_items):
    iy = info_start_y + i * Inches(1.35)
    add_icon_circle(slide3, Inches(6.8), iy + Inches(0.1), Inches(0.5), icon, ACCENT_BLUE, WHITE, 14)
    add_textbox(slide3, Inches(7.5), iy, Inches(2), Inches(0.3),
                label, font_size=12, bold=True, color=NAVY)
    add_textbox(slide3, Inches(7.5), iy + Inches(0.3), Inches(2.5), Inches(0.6),
                desc, font_size=10, color=DARK_GRAY)

# Internship info box
info_box = add_rounded_rect(slide3, Inches(6.8), Inches(5.6), Inches(5.5), Inches(1.4), NAVY)
add_textbox(slide3, Inches(7.0), Inches(5.7), Inches(5), Inches(0.3),
            "🔹 Internship Details", font_size=12, bold=True, color=WHITE)
add_textbox(slide3, Inches(7.0), Inches(6.0), Inches(5), Inches(0.9),
            f"Department: Web Development\nMentor: {MENTOR_NAME}\nDuration: {INTERN_DURATION}\nRole: {DESIGNATION}",
            font_size=11, color=RGBColor(0xCC, 0xDD, 0xEE))


# ==============================================================================
# SLIDE 4 — DOMAIN & TECHNOLOGY STACK
# ==============================================================================
slide4 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide4, WHITE)
add_bg_rect(slide4, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide4, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Domain & Technology Stack", font_size=28, bold=True, color=WHITE)
add_textbox(slide4, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "MERN Stack — Modern Full-Stack Web Development Technologies", 
            font_size=13, color=MED_BLUE)

# Technology cards - 2 rows of 4
tech_cards = [
    ("⚛️", "Frontend", "React.js\nTypeScript\nTailwind CSS\nVite", ACCENT_BLUE),
    ("🖥️", "Backend", "Node.js\nExpress.js\nREST APIs\nJWT Auth", GREEN),
    ("🗄️", "Database", "MongoDB Atlas\nMongoose ODM\nGeoJSON\nIndexes", ORANGE),
    ("🔐", "Auth", "JWT Tokens\nbcrypt\nRole-based\nAccess Control", RED),
    ("🗺️", "GIS Mapping", "Leaflet.js\nOpenStreetMap\nGeo-fencing\nHeat Maps", PURPLE),
    ("⚡", "Real-Time", "Socket.IO\nWebSockets\nLive Updates\nChat System", TEAL),
    ("🚀", "Deployment", "Render Cloud\nDocker\nCI/CD (GitHub Actions)\nNginx", PINK),
    ("📦", "Version Ctrl", "Git\nGitHub\nFeature Branches\nCode Reviews", ACCENT_BLUE),
]

card_w = Inches(2.9)
card_h = Inches(2.3)
cx_start = Inches(0.5)
cy_start = Inches(1.5)
cgap = Inches(0.22)

for idx, (icon, title, techs, color) in enumerate(tech_cards):
    col = idx % 4
    row = idx // 4
    cx = cx_start + col * (card_w + cgap)
    cy = cy_start + row * (card_h + cgap)
    
    # Card
    card = add_rounded_rect(slide4, cx, cy, card_w, card_h, WHITE, LIGHT_BLUE)
    add_shadow(card)
    
    # Top accent
    accent = slide4.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx, cy, card_w, Inches(0.06))
    accent.fill.solid()
    accent.fill.fore_color.rgb = color
    accent.line.fill.background()
    
    # Icon circle
    add_icon_circle(slide4, cx + Inches(0.15), cy + Inches(0.2), Inches(0.5), icon, color, WHITE, 16)
    
    # Title
    add_textbox(slide4, cx + Inches(0.75), cy + Inches(0.25), card_w - Inches(1), Inches(0.3),
                title, font_size=13, bold=True, color=color)
    
    # Techs
    add_textbox(slide4, cx + Inches(0.15), cy + Inches(0.8), card_w - Inches(0.3), Inches(1.3),
                techs, font_size=10, color=DARK_GRAY)

# Bottom - Architecture Flow
flow_y = Inches(5.9)
add_textbox(slide4, Inches(0.5), flow_y, Inches(4), Inches(0.3),
            "📊 Technology Architecture Flow", font_size=13, bold=True, color=NAVY)

flow_items = ["React.js\nFrontend", "Express.js\nAPI Layer", "MongoDB\nDatabase"]
flow_colors = [ACCENT_BLUE, GREEN, ORANGE]
flow_x = Inches(0.8)
for i, (label, color) in enumerate(zip(flow_items, flow_colors)):
    fx = flow_x + i * Inches(3.8)
    fbox = add_rounded_rect(slide4, fx, flow_y + Inches(0.4), Inches(2.0), Inches(0.9), color)
    add_textbox(slide4, fx, flow_y + Inches(0.45), Inches(2.0), Inches(0.8),
                label, font_size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    if i < 2:
        add_arrow_right(slide4, fx + Inches(2.0), flow_y + Inches(0.65), Inches(1.6), Inches(0.35), MED_BLUE)


# ==============================================================================
# SLIDE 5 — INTERNSHIP OBJECTIVES
# ==============================================================================
slide5 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide5, WHITE)
add_bg_rect(slide5, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide5, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Internship Objectives", font_size=28, bold=True, color=WHITE)
add_textbox(slide5, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "Goals, Responsibilities & Learning Outcomes", font_size=13, color=MED_BLUE)

# SmartArt-like layout with 4 interconnected objectives
obj_data = [
    ("🎯", "Primary\nObjective", "Build a full-stack disaster\nrelief coordination platform\nusing the MERN stack", ACCENT_BLUE),
    ("📋", "Problem\nStatement", "Lack of centralized coordination\nin disaster management leads to\ndelayed response & poor resource allocation", GREEN),
    ("👨‍💻", "Key\nResponsibilities", "Frontend & backend development\nAPI design, Database modeling\nIntegration & Deployment", ORANGE),
    ("📚", "Learning\nGoals", "Master React, Node.js, MongoDB\nReal-time systems, GIS mapping\nAgile development practices", RED),
]

for i, (icon, title, desc, color) in enumerate(obj_data):
    ox = Inches(0.5 + i * 3.15)
    oy = Inches(1.5)
    
    # Card
    card = add_rounded_rect(slide5, ox, oy, Inches(2.9), Inches(3.5), WHITE, LIGHT_BLUE)
    add_shadow(card)
    
    # Top colored accent
    tbar = slide5.shapes.add_shape(MSO_SHAPE.RECTANGLE, ox, oy, Inches(2.9), Inches(0.06))
    tbar.fill.solid()
    tbar.fill.fore_color.rgb = color
    tbar.line.fill.background()
    
    # Icon circle
    add_icon_circle(slide5, ox + Inches(1.0), oy + Inches(0.25), Inches(0.7), icon, color, WHITE, 20)
    
    # Title
    add_textbox(slide5, ox + Inches(0.2), oy + Inches(1.1), Inches(2.5), Inches(0.8),
                title, font_size=14, bold=True, color=color, align=PP_ALIGN.CENTER)
    
    # Description
    add_textbox(slide5, ox + Inches(0.2), oy + Inches(1.9), Inches(2.5), Inches(1.4),
                desc, font_size=11, color=DARK_GRAY, align=PP_ALIGN.CENTER)
    
    # Connector arrow
    if i < 3:
        arr_x = ox + Inches(2.9)
        add_arrow_right(slide5, arr_x, oy + Inches(1.5), Inches(0.3), Inches(0.25), MED_BLUE)

# Expected Outcomes at bottom
outcomes_box = add_rounded_rect(slide5, Inches(0.5), Inches(5.3), Inches(12.3), Inches(1.7), SOFT_BLUE, LIGHT_BLUE)
add_textbox(slide5, Inches(0.8), Inches(5.4), Inches(5), Inches(0.3),
            "✅ Expected Outcomes", font_size=14, bold=True, color=NAVY)

outcomes = [
    "Production-ready disaster management platform deployed on cloud",
    "Enhanced skills in full-stack development, real-time systems & GIS integration",
    "Comprehensive understanding of SDLC, Agile methodology & DevOps practices",
    "Professional portfolio demonstrating real-world government application development",
]
out_text = "\n".join(f"• {o}" for o in outcomes)
add_textbox(slide5, Inches(0.8), Inches(5.7), Inches(11.5), Inches(1.2),
            out_text, font_size=11, color=DARK_GRAY)


# ==============================================================================
# SLIDE 6 — PROJECT OVERVIEW
# ==============================================================================
slide6 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide6, WHITE)
add_bg_rect(slide6, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide6, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Project Overview", font_size=28, bold=True, color=WHITE)
add_textbox(slide6, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            PROJECT_TITLE + " — Bridging the Gap in Disaster Response Coordination", 
            font_size=13, color=MED_BLUE)

# Left - Problem & Solution
add_textbox(slide6, Inches(0.6), Inches(1.5), Inches(6), Inches(0.3),
            "⚠️ Existing Problems", font_size=15, bold=True, color=RED)

problems = [
    "Delayed communication between stakeholders during emergencies",
    "Inefficient manual resource allocation & inventory tracking",
    "Lack of real-time situational awareness for field teams",
    "No centralized platform for citizen reporting & SOS alerts",
    "Poor coordination between NGOs, volunteers & government agencies",
]
for i, p in enumerate(problems):
    py = Inches(1.9) + i * Inches(0.35)
    add_textbox(slide6, Inches(0.8), py, Inches(5.5), Inches(0.35),
                f"✕  {p}", font_size=10, color=DARK_GRAY)

add_textbox(slide6, Inches(0.6), Inches(3.75), Inches(6), Inches(0.3),
            "✅ Proposed Solution", font_size=15, bold=True, color=GREEN)

solutions = [
    "Real-time multi-channel communication & alert system",
    "Centralized resource tracking with automated allocation",
    "Interactive GIS maps with live incident tracking",
    "Multi-language SOS system with GPS coordinates",
    "Role-based dashboards for all stakeholders",
]
for i, s in enumerate(solutions):
    sy = Inches(4.15) + i * Inches(0.35)
    add_textbox(slide6, Inches(0.8), sy, Inches(5.5), Inches(0.35),
                f"✓  {s}", font_size=10, color=DARK_GRAY)

# Right - User Roles (SmartArt-style)
add_textbox(slide6, Inches(7.2), Inches(1.5), Inches(5.5), Inches(0.3),
            "👥 User Roles", font_size=15, bold=True, color=NAVY)

roles = [
    ("👤", "Citizen", "Report incidents, get\nSOS alerts & updates", ACCENT_BLUE),
    ("🦸", "Volunteer", "Accept tasks, help\nwith relief operations", GREEN),
    ("🏢", "NGO", "Coordinate resources\n& manage volunteers", ORANGE),
    ("🏛️", "Govt", "Monitor situations\n& allocate resources", RED),
    ("⚙️", "Admin", "Full system control\n& analytics dashboard", PURPLE),
]

for i, (icon, role, desc, color) in enumerate(roles):
    ry = Inches(1.9) + i * Inches(1.05)
    # Role icon
    add_icon_circle(slide6, Inches(7.2), ry, Inches(0.45), icon, color, WHITE, 14)
    # Role name
    add_textbox(slide6, Inches(7.8), ry, Inches(1.5), Inches(0.25),
                role, font_size=12, bold=True, color=NAVY)
    # Description
    add_textbox(slide6, Inches(7.8), ry + Inches(0.25), Inches(4.5), Inches(0.5),
                desc, font_size=9, color=DARK_GRAY)

# Bottom - Benefits bar
benefits_box = add_rounded_rect(slide6, Inches(0.5), Inches(6.3), Inches(12.3), Inches(0.8), NAVY)
add_textbox(slide6, Inches(0.7), Inches(6.35), Inches(12), Inches(0.7),
            "🌟 Benefits: Faster Response Time  •  Efficient Resource Utilization  •  Improved Coordination  •  Data-Driven Decisions  •  Multi-Lingual Accessibility",
            font_size=11, color=WHITE, align=PP_ALIGN.CENTER)


# ==============================================================================
# SLIDE 7 — SYSTEM ARCHITECTURE
# ==============================================================================
slide7 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide7, WHITE)
add_bg_rect(slide7, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide7, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "System Architecture", font_size=28, bold=True, color=WHITE)
add_textbox(slide7, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "Three-Tier Architecture with Real-Time Capabilities", 
            font_size=13, color=MED_BLUE)

# Architecture layers - bottom up
layers = [
    ("📊", "Reports & Analytics", "Admin Dashboards • Charts • Data Export", "Reports", PURPLE, Inches(0.5), Inches(6.0)),
    ("🗺️", "Leaflet GIS Maps", "Interactive Maps • Geo-fencing • Heat Maps", "Maps", TEAL, Inches(0.5), Inches(5.2)),
    ("⚡", "Socket.IO Real-Time", "Live Updates • WebSocket • Push Notifications", "Real-Time", PINK, Inches(0.5), Inches(4.4)),
    ("🗄️", "MongoDB Atlas", "NoSQL Database • GeoJSON • Mongoose ODM", "Database", ORANGE, Inches(0.5), Inches(3.6)),
    ("🔐", "JWT Authentication", "Token Auth • bcrypt • Role-Based Access", "Auth", RED, Inches(0.5), Inches(2.8)),
    ("🖥️", "Node.js / Express API", "REST Endpoints • Middleware • Business Logic", "Backend", GREEN, Inches(0.5), Inches(2.0)),
    ("⚛️", "React.js Frontend", "TypeScript • Components • Context • PWA", "Frontend", ACCENT_BLUE, Inches(0.5), Inches(1.2)),
]

for icon, title, desc, label, color, lx, ly in layers:
    # Layer box
    lw = Inches(8.0)
    lh = Inches(0.7)
    lbox = add_rounded_rect(slide7, lx, ly, lw, lh, color)
    # Icon
    add_textbox(slide7, lx + Inches(0.15), ly + Inches(0.08), Inches(0.5), Inches(0.5),
                icon, font_size=20, color=WHITE, align=PP_ALIGN.CENTER)
    # Title
    add_textbox(slide7, lx + Inches(0.6), ly + Inches(0.05), Inches(3), Inches(0.3),
                title, font_size=13, bold=True, color=WHITE)
    # Description
    add_textbox(slide7, lx + Inches(0.6), ly + Inches(0.35), Inches(6), Inches(0.3),
                desc, font_size=9, color=RGBColor(0xDD, 0xEE, 0xFF))
    # Label on right
    add_textbox(slide7, lx + Inches(6.5), ly + Inches(0.1), Inches(1.3), Inches(0.5),
                label, font_size=10, bold=True, color=WHITE, align=PP_ALIGN.RIGHT)
    
    # Arrow between layers (except top)
    if ly > Inches(1.2):
        arrow = slide7.shapes.add_shape(MSO_SHAPE.DOWN_ARROW, 
                                         Inches(4.0), ly - Inches(0.2), 
                                         Inches(0.4), Inches(0.2))
        arrow.fill.solid()
        arrow.fill.fore_color.rgb = MED_GRAY
        arrow.line.fill.background()

# Users on top
user_box = add_rounded_rect(slide7, Inches(3.0), Inches(0.4), Inches(3.0), Inches(0.65), NAVY)
add_textbox(slide7, Inches(3.0), Inches(0.42), Inches(3.0), Inches(0.6),
            "👥  Users  👥", font_size=14, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

# Right side - additional boxes
rt_y = Inches(1.2)
extra_items = [
    ("🌐", "Deployment\nRender + Docker", ACCENT_BLUE),
    ("📱", "PWA\nOffline Support", GREEN),
    ("🔒", "Security\nHelmet • Rate Limit", ORANGE),
    ("🧪", "Testing\nVitest • Playwright", RED),
]

for i, (icon, title, color) in enumerate(extra_items):
    ex = Inches(9.0)
    ey = rt_y + i * Inches(1.45)
    ebox = add_rounded_rect(slide7, ex, ey, Inches(3.8), Inches(1.2), SOFT_BLUE, LIGHT_BLUE)
    add_shadow(ebox)
    # Icon
    add_icon_circle(slide7, ex + Inches(0.15), ey + Inches(0.15), Inches(0.5), icon, color, WHITE, 16)
    # Title
    add_textbox(slide7, ex + Inches(0.8), ey + Inches(0.2), Inches(2.8), Inches(0.8),
                title, font_size=11, color=DARK_GRAY)


# ==============================================================================
# SLIDE 8 — MAJOR MODULES
# ==============================================================================
slide8 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide8, WHITE)
add_bg_rect(slide8, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide8, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Major Modules", font_size=28, bold=True, color=WHITE)
add_textbox(slide8, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "10 Core Modules Powering the Disaster Relief Platform", 
            font_size=13, color=MED_BLUE)

modules = [
    ("🔐", "Authentication\n& User Roles", "JWT-based auth with 5 user roles:\nCitizen, Volunteer, NGO,\nGovernment & Admin", ACCENT_BLUE),
    ("🆘", "SOS Alert\nSystem", "One-click emergency broadcast\nwith GPS coordinates &\nauto-notification to authorities", RED),
    ("🌊", "Disaster\nReporting", "Citizens can report incidents\nwith images, location &\ndisaster type classification", ORANGE),
    ("🤝", "Volunteer\nManagement", "Volunteer registration, task\nassignment, skill matching\n& activity tracking", GREEN),
    ("📦", "Resource\nAllocation", "Inventory management, request\nmatching, automated\nresource distribution", PURPLE),
    ("🏠", "Shelter\nLocator", "GIS-based shelter mapping,\ncapacity tracking &\noccupancy monitoring", TEAL),
    ("📊", "Reports &\nAnalytics", "Interactive dashboards with\ncharts, KPIs & exportable\nreports for administrators", PINK),
    ("⚙️", "Admin\nDashboard", "Complete system control,\nuser management &\nconfiguration settings", NAVY),
    ("🔔", "Notification\nSystem", "Multi-channel alerts via\nemail, in-app & SMS\nfor timely updates", ORANGE),
    ("🗺️", "Live Map\n& Geofencing", "Real-time incident tracking,\ngeo-fence zones &\nheat map visualization", ACCENT_BLUE),
]

mcard_w = Inches(2.35)
mcard_h = Inches(2.8)
mgap_x = Inches(0.22)
mgap_y = Inches(0.2)
mstart_x = Inches(0.4)
mstart_y = Inches(1.5)

for idx, (icon, title, desc, color) in enumerate(modules):
    col = idx % 5
    row = idx // 5
    mx = mstart_x + col * (mcard_w + mgap_x)
    my = mstart_y + row * (mcard_h + mgap_y)
    
    # Card
    mcard = add_rounded_rect(slide8, mx, my, mcard_w, mcard_h, WHITE, LIGHT_BLUE)
    add_shadow(mcard)
    
    # Colored top bar
    tbar = slide8.shapes.add_shape(MSO_SHAPE.RECTANGLE, mx, my, mcard_w, Inches(0.06))
    tbar.fill.solid()
    tbar.fill.fore_color.rgb = color
    tbar.line.fill.background()
    
    # Icon circle
    add_icon_circle(slide8, mx + Inches(0.85), my + Inches(0.15), Inches(0.55), icon, color, WHITE, 18)
    
    # Title
    add_textbox(slide8, mx + Inches(0.1), my + Inches(0.8), mcard_w - Inches(0.2), Inches(0.7),
                title, font_size=12, bold=True, color=color, align=PP_ALIGN.CENTER)
    
    # Description
    add_textbox(slide8, mx + Inches(0.1), my + Inches(1.5), mcard_w - Inches(0.2), Inches(1.2),
                desc, font_size=8.5, color=DARK_GRAY, align=PP_ALIGN.CENTER)


# ==============================================================================
# SLIDE 9 — DATABASE DESIGN
# ==============================================================================
slide9 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide9, WHITE)
add_bg_rect(slide9, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide9, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Database Design", font_size=28, bold=True, color=WHITE)
add_textbox(slide9, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "MongoDB Collections & Data Relationships", font_size=13, color=MED_BLUE)

# Collections - as cards
collections = [
    ("👤", "Users", "15 fields", ACCENT_BLUE),
    ("📋", "Requests", "22 fields", GREEN),
    ("🆘", "SOS Alerts", "10 fields", RED),
    ("📌", "Incidents", "18 fields", ORANGE),
    ("📦", "Resources", "14 fields", PURPLE),
    ("🔔", "Notifications", "8 fields", TEAL),
    ("📝", "Audit Logs", "7 fields", PINK),
    ("🗺️", "Zones", "12 fields", NAVY),
]

cstart_x = Inches(0.5)
cstart_y = Inches(1.5)
c_cols = 4
for i, (icon, name, fields, color) in enumerate(collections):
    col = i % c_cols
    row = i // c_cols
    cx = cstart_x + col * Inches(3.1)
    cy = cstart_y + row * Inches(1.0)
    
    # Collection card
    cbox = add_rounded_rect(slide9, cx, cy, Inches(2.8), Inches(0.8), color)
    add_textbox(slide9, cx + Inches(0.1), cy + Inches(0.05), Inches(0.5), Inches(0.7),
                icon, font_size=22, color=WHITE, align=PP_ALIGN.CENTER)
    add_textbox(slide9, cx + Inches(0.5), cy + Inches(0.1), Inches(1.5), Inches(0.3),
                name, font_size=14, bold=True, color=WHITE)
    add_textbox(slide9, cx + Inches(0.5), cy + Inches(0.4), Inches(1.5), Inches(0.3),
                fields, font_size=10, color=RGBColor(0xDD, 0xEE, 0xFF))

# ER Diagram (simplified visual representation)
add_textbox(slide9, Inches(0.5), Inches(3.7), Inches(5), Inches(0.3),
            "📊 Entity Relationship Diagram", font_size=14, bold=True, color=NAVY)

# Draw a simplified ER diagram using boxes and arrows
# Central entity
center_x = Inches(4.5)
center_y = Inches(4.4)
cbox = add_rounded_rect(slide9, center_x, center_y, Inches(2.5), Inches(0.8), ACCENT_BLUE)
add_textbox(slide9, center_x, center_y + Inches(0.15), Inches(2.5), Inches(0.5),
            "📋 Requests", font_size=13, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

# Related entities around it
rel_entities = [
    (Inches(0.8), Inches(4.0), "👤 Users", ACCENT_BLUE),
    (Inches(0.8), Inches(5.4), "🆘 SOS Alerts", RED),
    (Inches(8.0), Inches(4.0), "📦 Resources", GREEN),
    (Inches(8.0), Inches(5.4), "📌 Incidents", ORANGE),
]

for rx, ry, rtext, rcolor in rel_entities:
    rbox = add_rounded_rect(slide9, rx, ry, Inches(2.0), Inches(0.65), rcolor)
    add_textbox(slide9, rx, ry + Inches(0.08), Inches(2.0), Inches(0.5),
                rtext, font_size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

# Connection lines (simple rectangles as lines)
# Users -> Requests
line1 = slide9.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(2.8), Inches(4.2), Inches(1.7), Inches(0.04))
line1.fill.solid(); line1.fill.fore_color.rgb = MED_GRAY; line1.line.fill.background()

# SOS -> Requests
line2 = slide9.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(2.8), Inches(5.6), Inches(1.7), Inches(0.04))
line2.fill.solid(); line2.fill.fore_color.rgb = MED_GRAY; line2.line.fill.background()

# Requests -> Resources
line3 = slide9.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(7.0), Inches(4.2), Inches(1.0), Inches(0.04))
line3.fill.solid(); line3.fill.fore_color.rgb = MED_GRAY; line3.line.fill.background()

# Requests -> Incidents
line4 = slide9.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(7.0), Inches(5.6), Inches(1.0), Inches(0.04))
line4.fill.solid(); line4.fill.fore_color.rgb = MED_GRAY; line4.line.fill.background()

# Labels on connections
add_textbox(slide9, Inches(3.2), Inches(4.05), Inches(1.0), Inches(0.25),
            "1:N", font_size=9, bold=True, color=ACCENT_BLUE)
add_textbox(slide9, Inches(3.2), Inches(5.45), Inches(1.0), Inches(0.25),
            "1:N", font_size=9, bold=True, color=RED)
add_textbox(slide9, Inches(7.0), Inches(4.05), Inches(1.0), Inches(0.25),
            "N:1", font_size=9, bold=True, color=GREEN)
add_textbox(slide9, Inches(7.0), Inches(5.45), Inches(1.0), Inches(0.25),
            "N:1", font_size=9, bold=True, color=ORANGE)

# Bottom: Key features
feat_box = add_rounded_rect(slide9, Inches(0.5), Inches(6.3), Inches(12.3), Inches(0.8), SOFT_BLUE, LIGHT_BLUE)
add_textbox(slide9, Inches(0.7), Inches(6.35), Inches(12), Inches(0.7),
            "💡 Schema Features: Mongoose ODM with Validation  •  GeoJSON Indexes for Spatial Queries  •  Compound Indexes  •  Data Population & Referencing",
            font_size=11, color=DARK_GRAY)


# ==============================================================================
# SLIDE 10 — SYSTEM WORKFLOW
# ==============================================================================
slide10 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide10, WHITE)
add_bg_rect(slide10, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide10, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "System Workflow", font_size=28, bold=True, color=WHITE)
add_textbox(slide10, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "End-to-End Disaster Response Flow", font_size=13, color=MED_BLUE)

# Workflow - horizontal process flow
flow_steps = [
    ("🔐", "Login", "User authenticates\nvia JWT", ACCENT_BLUE),
    ("📊", "Dashboard", "Role-based view\nof incidents", GREEN),
    ("📝", "Create\nRequest", "Report disaster\nwith details", ORANGE),
    ("🗄️", "Database", "Save to MongoDB\nGeoJSON data", RED),
    ("🔔", "Notify\nVolunteers", "Socket.IO push\nnotification", PURPLE),
    ("📦", "Allocate\nResources", "Match resources\nto needs", TEAL),
    ("🔄", "Update\nStatus", "Track progress\nreal-time", PINK),
    ("✅", "Completed", "Resolve &\narchive case", NAVY),
]

fstart_x = Inches(0.4)
fstart_y = Inches(1.6)
fcard_w = Inches(1.4)
fcard_h = Inches(1.9)

for i, (icon, title, desc, color) in enumerate(flow_steps):
    fx = fstart_x + i * (fcard_w + Inches(0.15))
    
    # Step card
    fbox = add_rounded_rect(slide10, fx, fstart_y, fcard_w, fcard_h, WHITE, LIGHT_BLUE)
    add_shadow(fbox)
    
    # Top accent
    tbar = slide10.shapes.add_shape(MSO_SHAPE.RECTANGLE, fx, fstart_y, fcard_w, Inches(0.05))
    tbar.fill.solid(); tbar.fill.fore_color.rgb = color; tbar.line.fill.background()
    
    # Step number
    step_circle = add_circle(slide10, fx + Inches(0.5), fstart_y + Inches(0.12), Inches(0.35), color)
    add_textbox(slide10, fx + Inches(0.5), fstart_y + Inches(0.15), Inches(0.35), Inches(0.30),
                str(i+1), font_size=12, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    
    # Icon
    add_textbox(slide10, fx + Inches(0.35), fstart_y + Inches(0.55), Inches(0.7), Inches(0.5),
                icon, font_size=22, align=PP_ALIGN.CENTER)
    
    # Title
    add_textbox(slide10, fx + Inches(0.05), fstart_y + Inches(1.0), fcard_w - Inches(0.1), Inches(0.4),
                title, font_size=11, bold=True, color=color, align=PP_ALIGN.CENTER)
    
    # Description
    add_textbox(slide10, fx + Inches(0.05), fstart_y + Inches(1.35), fcard_w - Inches(0.1), Inches(0.5),
                desc, font_size=8, color=DARK_GRAY, align=PP_ALIGN.CENTER)
    
    # Arrow between steps
    if i < len(flow_steps) - 1:
        ax = fx + fcard_w
        arrow = slide10.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, ax, fstart_y + Inches(0.85), 
                                          Inches(0.15), Inches(0.2))
        arrow.fill.solid(); arrow.fill.fore_color.rgb = MED_BLUE; arrow.line.fill.background()

# Bottom - Workflow description
wf_box = add_rounded_rect(slide10, Inches(0.4), Inches(3.8), Inches(12.5), Inches(3.2), SOFT_BLUE, LIGHT_BLUE)
add_textbox(slide10, Inches(0.7), Inches(3.9), Inches(5), Inches(0.3),
            "📋 Detailed Workflow Description", font_size=14, bold=True, color=NAVY)

wf_details = [
    "1. User logs in with credentials → JWT token generated for secure session",
    "2. Dashboard loads role-specific data (incidents, tasks, resources based on user type)",
    "3. Citizen creates a disaster request with type, description, location & media attachments",
    "4. Data is stored in MongoDB with GeoJSON coordinates for spatial indexing",
    "5. Socket.IO broadcasts real-time notification to volunteers & authorities in the zone",
    "6. Resources (food, water, medical, shelter) are auto-matched and allocated by the system",
    "7. Volunteers update task status (Accepted → In Progress → Completed) in real-time",
    "8. Admin reviews and closes completed cases with final reports & analytics"
]
add_textbox(slide10, Inches(0.7), Inches(4.25), Inches(12), Inches(2.5),
            "\n".join(wf_details), font_size=10, color=DARK_GRAY)


# ==============================================================================
# SLIDE 11 — WORK PERFORMED (Timeline)
# ==============================================================================
slide11 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide11, WHITE)
add_bg_rect(slide11, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide11, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Work Performed", font_size=28, bold=True, color=WHITE)
add_textbox(slide11, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "6-Month Internship Timeline — Key Milestones", font_size=13, color=MED_BLUE)

# Timeline - horizontal with alternating cards
timeline_y = Inches(3.8)
# Timeline line
timeline_line = slide11.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.5), timeline_y, Inches(12.3), Inches(0.06))
timeline_line.fill.solid()
timeline_line.fill.fore_color.rgb = ACCENT_BLUE
timeline_line.line.fill.background()

months = [
    ("Jan\n2026", "Week 1-2", "📋", "Requirement Analysis\n& Project Planning", ACCENT_BLUE, True),
    ("Jan-Feb", "Week 3-4", "🎨", "UI/UX Design\n& Prototyping", GREEN, True),
    ("Feb-Mar", "Week 5-8", "⚛️", "Frontend Development\n(React + TypeScript)", ORANGE, True),
    ("Mar-Apr", "Week 9-12", "🔐", "Authentication & Backend\n(Node + Express + JWT)", RED, False),
    ("Apr-May", "Week 13-16", "🔄", "Socket.IO Real-Time\n& MongoDB Integration", PURPLE, False),
    ("May-Jun", "Week 17-20", "🧪", "Testing, Documentation\n& Deployment", TEAL, False),
]

for i, (month, weeks, icon, desc, color, is_top) in enumerate(months):
    mx = Inches(0.5) + i * Inches(2.1)
    
    # Circle on timeline
    circle_size = Inches(0.35)
    cx = mx + Inches(0.85)
    cy = timeline_y - Inches(0.15)
    add_circle(slide11, cx, cy, circle_size, color)
    add_textbox(slide11, cx, cy + Inches(0.02), circle_size, circle_size,
                str(i+1), font_size=11, bold=True, color=WHITE, align=PP_ALIGN.CENTER)
    
    if is_top:
        # Above timeline
        card_bottom = timeline_y - Inches(0.25)
        # Connector line from circle up
        conn = slide11.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx + Inches(0.15), card_bottom - Inches(1.5), Inches(0.04), Inches(1.5))
        conn.fill.solid(); conn.fill.fore_color.rgb = color; conn.line.fill.background()
        
        # Card above
        card = add_rounded_rect(slide11, mx, card_bottom - Inches(1.5), Inches(1.7), Inches(1.4), WHITE, LIGHT_BLUE)
        add_shadow(card)
        # Accent bar at bottom
        abar = slide11.shapes.add_shape(MSO_SHAPE.RECTANGLE, mx, card_bottom - Inches(0.1), Inches(1.7), Inches(0.04))
        abar.fill.solid(); abar.fill.fore_color.rgb = color; abar.line.fill.background()
        
        # Icon
        add_textbox(slide11, mx + Inches(0.55), card_bottom - Inches(1.35), Inches(0.6), Inches(0.5),
                    icon, font_size=18, align=PP_ALIGN.CENTER)
        # Description
        add_textbox(slide11, mx + Inches(0.08), card_bottom - Inches(0.85), Inches(1.55), Inches(0.7),
                    desc, font_size=8.5, color=DARK_GRAY, align=PP_ALIGN.CENTER)
        
        # Month label on top
        add_textbox(slide11, mx + Inches(0.1), card_bottom - Inches(1.7), Inches(1.7), Inches(0.3),
                    month, font_size=8, bold=True, color=color, align=PP_ALIGN.CENTER)
        # Weeks label
        add_textbox(slide11, mx + Inches(0.1), card_bottom - Inches(2.0), Inches(1.7), Inches(0.3),
                    weeks, font_size=7, color=MED_GRAY, align=PP_ALIGN.CENTER)
    else:
        # Below timeline
        card_top = timeline_y + Inches(0.25)
        conn = slide11.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx + Inches(0.15), card_top, Inches(0.04), Inches(1.5))
        conn.fill.solid(); conn.fill.fore_color.rgb = color; conn.line.fill.background()
        
        card = add_rounded_rect(slide11, mx, card_top + Inches(0.1), Inches(1.7), Inches(1.4), WHITE, LIGHT_BLUE)
        add_shadow(card)
        abar = slide11.shapes.add_shape(MSO_SHAPE.RECTANGLE, mx, card_top + Inches(0.1), Inches(1.7), Inches(0.04))
        abar.fill.solid(); abar.fill.fore_color.rgb = color; abar.line.fill.background()
        
        add_textbox(slide11, mx + Inches(0.55), card_top + Inches(0.2), Inches(0.6), Inches(0.5),
                    icon, font_size=18, align=PP_ALIGN.CENTER)
        add_textbox(slide11, mx + Inches(0.08), card_top + Inches(0.65), Inches(1.55), Inches(0.7),
                    desc, font_size=8.5, color=DARK_GRAY, align=PP_ALIGN.CENTER)
        
        add_textbox(slide11, mx + Inches(0.1), card_top + Inches(1.65), Inches(1.7), Inches(0.3),
                    month, font_size=8, bold=True, color=color, align=PP_ALIGN.CENTER)
        add_textbox(slide11, mx + Inches(0.1), card_top + Inches(1.95), Inches(1.7), Inches(0.3),
                    weeks, font_size=7, color=MED_GRAY, align=PP_ALIGN.CENTER)


# ==============================================================================
# SLIDE 12 — IMPLEMENTATION (Screenshots Placeholder)
# ==============================================================================
slide12 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide12, WHITE)
add_bg_rect(slide12, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide12, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Implementation", font_size=28, bold=True, color=WHITE)
add_textbox(slide12, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "Key Screens & Interface Showcase", font_size=13, color=MED_BLUE)

# Grid of screenshot placeholders
screens = [
    ("🔐", "Login Page", "JWT Authentication\nwith Role Selection", ACCENT_BLUE),
    ("📊", "Dashboard", "Role-based KPI Cards\n& Activity Feed", GREEN),
    ("🗺️", "Interactive Map", "Leaflet GIS with\nIncident Markers", ORANGE),
    ("🆘", "SOS Alert", "Emergency Broadcast\nwith GPS Location", RED),
    ("⚙️", "Admin Panel", "User Management\n& System Config", PURPLE),
    ("📋", "Requests", "Disaster Request\nManagement List", TEAL),
    ("🦸", "Volunteer Panel", "Task Assignment\n& Status Updates", PINK),
    ("📦", "Resources", "Inventory Tracking\n& Allocation", NAVY),
]

sgrid_x = Inches(0.4)
sgrid_y = Inches(1.5)
for i, (icon, title, desc, color) in enumerate(screens):
    col = i % 4
    row = i // 4
    sx = sgrid_x + col * Inches(3.15)
    sy = sgrid_y + row * Inches(2.9)
    
    # Placeholder frame for screenshot
    frame = add_rounded_rect(slide12, sx, sy, Inches(2.9), Inches(2.6), SOFT_BLUE, LIGHT_BLUE)
    add_shadow(frame)
    
    # "Screenshot" area
    ss_area = add_rounded_rect(slide12, sx + Inches(0.15), sy + Inches(0.15), 
                                Inches(2.6), Inches(1.6), WHITE, LIGHT_BLUE)
    add_textbox(slide12, sx + Inches(0.15), sy + Inches(0.6), Inches(2.6), Inches(0.7),
                icon, font_size=36, align=PP_ALIGN.CENTER)
    add_textbox(slide12, sx + Inches(0.15), sy + Inches(1.3), Inches(2.6), Inches(0.3),
                "[Screenshot]", font_size=9, italic=True, color=MED_GRAY, align=PP_ALIGN.CENTER)
    
    # Title
    add_textbox(slide12, sx + Inches(0.15), sy + Inches(1.85), Inches(2.6), Inches(0.3),
                title, font_size=12, bold=True, color=color, align=PP_ALIGN.CENTER)
    
    # Description
    add_textbox(slide12, sx + Inches(0.15), sy + Inches(2.15), Inches(2.6), Inches(0.4),
                desc, font_size=8.5, color=DARK_GRAY, align=PP_ALIGN.CENTER)


# ==============================================================================
# SLIDE 13 — TESTING
# ==============================================================================
slide13 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide13, WHITE)
add_bg_rect(slide13, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide13, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Testing & Quality Assurance", font_size=28, bold=True, color=WHITE)
add_textbox(slide13, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "Comprehensive Testing Strategy for Robust Application", font_size=13, color=MED_BLUE)

# Testing types cards
test_types = [
    ("🧪", "Unit Testing", "Individual components\n& functions tested\nwith Vitest", ACCENT_BLUE),
    ("🔗", "Integration\nTesting", "API endpoints &\nmodule interaction\nverification", GREEN),
    ("🌐", "API Testing", "RESTful API validation\nwith Postman &\nSupertest", ORANGE),
    ("⚙️", "System\nTesting", "End-to-end workflows\nusing Playwright\nframework", RED),
    ("✅", "Acceptance\nTesting", "User acceptance &\nstakeholder feedback\nvalidation", PURPLE),
]

for i, (icon, title, desc, color) in enumerate(test_types):
    tx = Inches(0.5 + i * 2.5)
    ty = Inches(1.5)
    
    card = add_rounded_rect(slide13, tx, ty, Inches(2.25), Inches(2.3), WHITE, LIGHT_BLUE)
    add_shadow(card)
    
    tbar = slide13.shapes.add_shape(MSO_SHAPE.RECTANGLE, tx, ty, Inches(2.25), Inches(0.06))
    tbar.fill.solid(); tbar.fill.fore_color.rgb = color; tbar.line.fill.background()
    
    add_icon_circle(slide13, tx + Inches(0.78), ty + Inches(0.15), Inches(0.55), icon, color, WHITE, 20)
    add_textbox(slide13, tx + Inches(0.1), ty + Inches(0.8), Inches(2.05), Inches(0.6),
                title, font_size=11, bold=True, color=color, align=PP_ALIGN.CENTER)
    add_textbox(slide13, tx + Inches(0.1), ty + Inches(1.4), Inches(2.05), Inches(0.8),
                desc, font_size=8.5, color=DARK_GRAY, align=PP_ALIGN.CENTER)

# Test Results Table
add_textbox(slide13, Inches(0.5), Inches(4.1), Inches(5), Inches(0.3),
            "📊 Test Results Summary", font_size=14, bold=True, color=NAVY)

test_headers = ["Test Type", "Test Cases", "Passed", "Failed", "Coverage"]
test_rows = [
    ["Unit Tests", "85", "85", "0", "92%"],
    ["Integration Tests", "45", "44", "1", "88%"],
    ["API Tests", "60", "60", "0", "95%"],
    ["E2E (Playwright)", "20", "19", "1", "85%"],
    ["Accessibility", "15", "15", "0", "WCAG AA"],
]
add_table(slide13, Inches(0.5), Inches(4.4), Inches(7.0), Inches(2.2),
          test_headers, test_rows, 
          [Inches(1.5), Inches(1.2), Inches(1.2), Inches(1.2), Inches(1.9)])

# Right - Key Achievements
add_textbox(slide13, Inches(8.0), Inches(4.1), Inches(5), Inches(0.3),
            "🏆 QA Achievements", font_size=14, bold=True, color=NAVY)

qa_items = [
    ("✓", "225+ total test cases executed", GREEN),
    ("✓", "98.7% overall pass rate", GREEN),
    ("✓", "WCAG AA accessibility compliance", GREEN),
    ("✓", "Zero critical security vulnerabilities", GREEN),
    ("✓", "CI/CD pipeline with automated testing", GREEN),
    ("✓", "Playwright E2E in headless Chrome", GREEN),
]

for i, (mark, text, color) in enumerate(qa_items):
    qy = Inches(4.5) + i * Inches(0.38)
    add_textbox(slide13, Inches(8.0), qy, Inches(4.5), Inches(0.35),
                f"{mark}  {text}", font_size=10, bold=True if mark == "✓" else False, 
                color=DARK_GRAY)


# ==============================================================================
# SLIDE 14 — RESULTS & ACHIEVEMENTS
# ==============================================================================
slide14 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide14, WHITE)
add_bg_rect(slide14, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide14, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Results & Achievements", font_size=28, bold=True, color=WHITE)
add_textbox(slide14, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "Deliverables, Performance Metrics & Key Accomplishments", font_size=13, color=MED_BLUE)

# Top row - Key metrics in big number cards
metrics = [
    ("20+", "Pages\nDeveloped", ACCENT_BLUE),
    ("30+", "API\nEndpoints", GREEN),
    ("95%", "Test\nCoverage", ORANGE),
    ("10", "Languages\nSupported", RED),
    ("5", "User\nRoles", PURPLE),
]

for i, (number, label, color) in enumerate(metrics):
    mx = Inches(0.4 + i * 2.55)
    my = Inches(1.5)
    
    mcard = add_rounded_rect(slide14, mx, my, Inches(2.3), Inches(1.5), WHITE, LIGHT_BLUE)
    add_shadow(mcard)
    
    # Number
    add_textbox(slide14, mx, my + Inches(0.15), Inches(2.3), Inches(0.6),
                number, font_size=30, bold=True, color=color, align=PP_ALIGN.CENTER)
    # Label
    add_textbox(slide14, mx, my + Inches(0.8), Inches(2.3), Inches(0.5),
                label, font_size=10, color=DARK_GRAY, align=PP_ALIGN.CENTER)

# Bottom - Two column layout
# Left: Features Completed
add_textbox(slide14, Inches(0.5), Inches(3.3), Inches(6), Inches(0.3),
            "✅ Features Completed", font_size=14, bold=True, color=NAVY)

features = [
    "JWT-based authentication with 5 role-based access levels",
    "Real-time SOS alert system with GPS coordinates",
    "Interactive GIS maps with Leaflet & OpenStreetMap",
    "Multi-language support (English + 9 Indian languages)",
    "PWA with offline service worker caching",
    "Bulk CSV import/export for data management",
    "Responsive design — mobile, tablet & desktop",
    "Admin analytics dashboard with Recharts visualization",
    "Socket.IO real-time notifications & chat",
    "Geo-fencing & heat map visualization",
]
feat_text = "\n".join(f"• {f}" for f in features)
add_textbox(slide14, Inches(0.5), Inches(3.65), Inches(6.2), Inches(3.2),
            feat_text, font_size=9.5, color=DARK_GRAY)

# Right: Achievements & Deployment
add_textbox(slide14, Inches(7.2), Inches(3.3), Inches(5.5), Inches(0.3),
            "🏆 Key Achievements", font_size=14, bold=True, color=NAVY)

achievements = [
    ("🚀", "Deployed on Render Cloud with Docker containerization"),
    ("🔒", "Enterprise-grade security (Helmet, Rate Limit, XSS sanitization)"),
    ("♿", "WCAG AA accessibility compliance verified with axe-core"),
    ("📱", "PWA installable on mobile & desktop devices"),
    ("🔄", "GitHub Actions CI/CD for automated testing & deployment"),
]
for i, (icon, text) in enumerate(achievements):
    ay = Inches(3.7) + i * Inches(0.55)
    add_textbox(slide14, Inches(7.2), ay, Inches(5.5), Inches(0.5),
                f"{icon}  {text}", font_size=10, color=DARK_GRAY)

# GitHub & Deployment box
git_box = add_rounded_rect(slide14, Inches(7.2), Inches(6.2), Inches(5.5), Inches(0.8), NAVY)
add_textbox(slide14, Inches(7.4), Inches(6.25), Inches(5), Inches(0.7),
            "ℹ️  GitHub Repository  |  Live Demo: render.com  |  Automated CI/CD Pipeline",
            font_size=10, color=WHITE, align=PP_ALIGN.CENTER)


# ==============================================================================
# SLIDE 15 — LEARNING OUTCOMES
# ==============================================================================
slide15 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide15, WHITE)
add_bg_rect(slide15, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide15, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Learning Outcomes", font_size=28, bold=True, color=WHITE)
add_textbox(slide15, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "Technical & Professional Skills Acquired During Internship", font_size=13, color=MED_BLUE)

# Technical Skills section
add_textbox(slide15, Inches(0.5), Inches(1.5), Inches(6), Inches(0.3),
            "💻 Technical Skills", font_size=16, bold=True, color=NAVY)

tech_skills = [
    ("⚛️", "React.js & TypeScript", "Component architecture, hooks, context API, React Router, lazy loading", ACCENT_BLUE),
    ("🖥️", "Node.js & Express.js", "REST API design, middleware, error handling, async patterns", GREEN),
    ("🗄️", "MongoDB & Mongoose", "Schema design, indexing, aggregation, GeoJSON queries", ORANGE),
    ("🔐", "JWT & Authentication", "Token-based auth, refresh tokens, role-based access control", RED),
    ("🌐", "REST API Design", "CRUD operations, request validation, response formatting", PURPLE),
    ("⚡", "Socket.IO", "WebSocket communication, real-time events, room-based broadcasting", TEAL),
    ("🗺️", "Leaflet.js GIS", "Interactive maps, markers, geo-fencing, heat map layers", PINK),
    ("🧪", "Testing (Vitest)", "Unit tests, integration tests, mock functions, code coverage", ACCENT_BLUE),
]

for i, (icon, skill, desc, color) in enumerate(tech_skills):
    col = i % 2
    row = i // 2
    sx = Inches(0.5) + col * Inches(6.2)
    sy = Inches(1.9) + row * Inches(0.9)
    
    # Skill card
    scard = add_rounded_rect(slide15, sx, sy, Inches(5.9), Inches(0.75), SOFT_BLUE, LIGHT_BLUE)
    add_textbox(slide15, sx + Inches(0.1), sy + Inches(0.05), Inches(0.4), Inches(0.65),
                icon, font_size=18, align=PP_ALIGN.CENTER)
    add_textbox(slide15, sx + Inches(0.5), sy + Inches(0.05), Inches(2.5), Inches(0.3),
                skill, font_size=11, bold=True, color=color)
    add_textbox(slide15, sx + Inches(0.5), sy + Inches(0.35), Inches(5), Inches(0.35),
                desc, font_size=8.5, color=DARK_GRAY)

# Professional Skills
add_textbox(slide15, Inches(0.5), Inches(5.7), Inches(6), Inches(0.3),
            "🤝 Professional Skills", font_size=16, bold=True, color=NAVY)

prof_skills = ["Agile Methodology", "Git & Version Control", "Team Collaboration", 
               "Problem Solving", "Technical Communication", "Time Management"]
prof_colors = [ACCENT_BLUE, GREEN, ORANGE, RED, PURPLE, TEAL]

for i, (skill, color) in enumerate(zip(prof_skills, prof_colors)):
    px = Inches(0.5 + i * 2.1)
    py = Inches(6.1)
    pcard = add_rounded_rect(slide15, px, py, Inches(1.9), Inches(0.6), color)
    add_textbox(slide15, px, py + Inches(0.1), Inches(1.9), Inches(0.4),
                skill, font_size=10, bold=True, color=WHITE, align=PP_ALIGN.CENTER)


# ==============================================================================
# SLIDE 16 — CHALLENGES
# ==============================================================================
slide16 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide16, WHITE)
add_bg_rect(slide16, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide16, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Challenges & Solutions", font_size=28, bold=True, color=WHITE)
add_textbox(slide16, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "Technical Hurdles Overcome During Development", font_size=13, color=MED_BLUE)

challenges = [
    ("🗄️", "Database Design", "Challenge: Designing an efficient MongoDB schema for complex relationships",
     "Solution: Implemented data referencing with Mongoose population and compound indexes",
     ACCENT_BLUE),
    ("🔐", "Authentication", "Challenge: Implementing secure JWT auth with role-based access for 5 user types",
     "Solution: Created middleware chain with JWT verification, role checking and rate limiting",
     GREEN),
    ("🔄", "Real-Time Sync", "Challenge: Maintaining real-time data consistency across multiple clients",
     "Solution: Used Socket.IO rooms for targeted broadcasting with event acknowledgment",
     ORANGE),
    ("🗺️", "Geo-Spatial Queries", "Challenge: Implementing efficient location-based queries for nearby resources",
     "Solution: Leveraged MongoDB 2dsphere indexes with $nearSphere and $geoWithin operators",
     RED),
    ("🚀", "Deployment", "Challenge: Overcoming CORS, environment config & production optimization issues",
     "Solution: Configured Nginx reverse proxy, Docker multi-stage builds & env variable management",
     PURPLE),
    ("🐛", "Bug Fixing", "Challenge: Debugging complex async operations and WebSocket connection issues",
     "Solution: Implemented structured logging with Winston, error boundaries & comprehensive error handling",
     TEAL),
]

for i, (icon, title, challenge, solution, color) in enumerate(challenges):
    col = i % 2
    row = i // 2
    cx = Inches(0.5) + col * Inches(6.2)
    cy = Inches(1.5) + row * Inches(1.85)
    
    # Challenge card
    ccard = add_rounded_rect(slide16, cx, cy, Inches(5.9), Inches(1.6), WHITE, LIGHT_BLUE)
    add_shadow(ccard)
    
    # Left accent
    laccent = slide16.shapes.add_shape(MSO_SHAPE.RECTANGLE, cx, cy, Inches(0.06), Inches(1.6))
    laccent.fill.solid(); laccent.fill.fore_color.rgb = color; laccent.line.fill.background()
    
    # Icon & Title
    add_icon_circle(slide16, cx + Inches(0.2), cy + Inches(0.15), Inches(0.5), icon, color, WHITE, 18)
    add_textbox(slide16, cx + Inches(0.8), cy + Inches(0.15), Inches(3), Inches(0.3),
                title, font_size=13, bold=True, color=color)
    
    # Challenge
    add_textbox(slide16, cx + Inches(0.2), cy + Inches(0.75), Inches(5.5), Inches(0.35),
                "⚠️ " + challenge, font_size=8.5, color=RED)
    
    # Solution
    add_textbox(slide16, cx + Inches(0.2), cy + Inches(1.15), Inches(5.5), Inches(0.35),
                "✅ " + solution, font_size=8.5, color=GREEN)


# ==============================================================================
# SLIDE 17 — FUTURE SCOPE
# ==============================================================================
slide17 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide17, WHITE)
add_bg_rect(slide17, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide17, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Future Scope", font_size=28, bold=True, color=WHITE)
add_textbox(slide17, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "Enhancements & Roadmap for Next Iterations", font_size=13, color=MED_BLUE)

# Future scope items with roadmap-style layout
future_items = [
    ("🤖", "AI Prediction", "ML models for disaster\nimpact prediction &\nresource optimization", ACCENT_BLUE, "High"),
    ("📡", "IoT Sensors", "Real-time sensor data\nfor early warning &\nenvironment monitoring", GREEN, "High"),
    ("🚁", "Drone Imaging", "Aerial damage assessment\n& real-time drone\nfeed integration", ORANGE, "Medium"),
    ("🛰️", "Satellite", "Satellite imagery for\nlarge-scale disaster\nzone mapping", RED, "Medium"),
    ("📱", "Android App", "Native mobile app with\noffline support &\nGPS-based reporting", PURPLE, "High"),
    ("🧠", "ML Analytics", "Predictive analytics for\nresource demand &\nvolunteer allocation", TEAL, "Medium"),
]

for i, (icon, title, desc, color, priority) in enumerate(future_items):
    col = i % 3
    row = i // 3
    fx = Inches(0.5) + col * Inches(4.15)
    fy = Inches(1.5) + row * Inches(2.85)
    
    # Card
    fcard = add_rounded_rect(slide17, fx, fy, Inches(3.9), Inches(2.5), WHITE, LIGHT_BLUE)
    add_shadow(fcard)
    
    # Gradient top bar
    tbar = slide17.shapes.add_shape(MSO_SHAPE.RECTANGLE, fx, fy, Inches(3.9), Inches(0.08))
    tbar.fill.solid(); tbar.fill.fore_color.rgb = color; tbar.line.fill.background()
    
    # Icon circle
    add_icon_circle(slide17, fx + Inches(1.55), fy + Inches(0.2), Inches(0.7), icon, color, WHITE, 24)
    
    # Title
    add_textbox(slide17, fx + Inches(0.2), fy + Inches(1.0), Inches(3.5), Inches(0.35),
                title, font_size=14, bold=True, color=color, align=PP_ALIGN.CENTER)
    
    # Description
    add_textbox(slide17, fx + Inches(0.2), fy + Inches(1.35), Inches(3.5), Inches(0.7),
                desc, font_size=10, color=DARK_GRAY, align=PP_ALIGN.CENTER)
    
    # Priority badge
    priority_color = GREEN if priority == "High" else ORANGE
    badge = add_rounded_rect(slide17, fx + Inches(1.2), fy + Inches(2.05), Inches(1.5), Inches(0.3), priority_color)
    add_textbox(slide17, fx + Inches(1.2), fy + Inches(2.07), Inches(1.5), Inches(0.28),
                f"Priority: {priority}", font_size=8, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

# Bottom note
note_box = add_rounded_rect(slide17, Inches(0.5), Inches(6.5), Inches(12.3), Inches(0.6), NAVY)
add_textbox(slide17, Inches(0.7), Inches(6.53), Inches(12), Inches(0.55),
            "🎯  Next Steps: Complete Android App Development → Integrate AI/ML Models → Deploy IoT Sensor Network → Satellite Integration",
            font_size=11, color=WHITE, align=PP_ALIGN.CENTER)


# ==============================================================================
# SLIDE 18 — CONCLUSION
# ==============================================================================
slide18 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide18, WHITE)
add_bg_rect(slide18, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide18, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Conclusion", font_size=28, bold=True, color=WHITE)
add_textbox(slide18, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "Summary, Impact & Internship Experience", font_size=13, color=MED_BLUE)

# Left - Summary section
add_textbox(slide18, Inches(0.5), Inches(1.5), Inches(6), Inches(0.3),
            "📋 Project Summary", font_size=16, bold=True, color=NAVY)

summary_text = (
    f"The Disaster Relief Coordination Platform was successfully designed, "
    f"developed, and deployed as a comprehensive full-stack web application. "
    f"The platform addresses critical gaps in disaster response coordination "
    f"by providing real-time communication, resource tracking, volunteer management, "
    f"incident reporting, SOS alerts, and interactive mapping capabilities — "
    f"all within a secure, scalable, and user-friendly interface."
)
add_textbox(slide18, Inches(0.5), Inches(1.85), Inches(6.2), Inches(1.5),
            summary_text, font_size=11, color=DARK_GRAY)

add_textbox(slide18, Inches(0.5), Inches(3.2), Inches(6), Inches(0.3),
            "🎯 Project Impact", font_size=16, bold=True, color=NAVY)

impact_text = (
    "• Reduced coordination response time through real-time alerts\n"
    "• Centralized resource allocation minimizing wastage\n"
    "• Multi-lingual support making it accessible across India\n"
    "• PWA capabilities ensuring offline functionality\n"
    "• Secure role-based access for all stakeholders"
)
add_textbox(slide18, Inches(0.5), Inches(3.55), Inches(6.2), Inches(1.5),
            impact_text, font_size=11, color=DARK_GRAY)

# Right - Experience cards
add_textbox(slide18, Inches(7.2), Inches(1.5), Inches(5.5), Inches(0.3),
            "🌟 Internship Experience", font_size=16, bold=True, color=NAVY)

exp_items = [
    ("🏢", "Industrial Learning", "Gained hands-on experience\nin a professional software\ndevelopment environment", ACCENT_BLUE),
    ("📈", "Career Growth", "Built a strong portfolio\nproject demonstrating\nfull-stack expertise", GREEN),
    ("🤝", "Professional Dev", "Improved communication,\ncollaboration & problem-\nsolving skills", ORANGE),
]

for i, (icon, title, desc, color) in enumerate(exp_items):
    ey = Inches(1.9) + i * Inches(1.55)
    
    ecard = add_rounded_rect(slide18, Inches(7.2), ey, Inches(5.5), Inches(1.35), SOFT_BLUE, LIGHT_BLUE)
    add_shadow(ecard)
    
    add_icon_circle(slide18, Inches(7.35), ey + Inches(0.15), Inches(0.5), icon, color, WHITE, 18)
    add_textbox(slide18, Inches(7.95), ey + Inches(0.15), Inches(2.5), Inches(0.3),
                title, font_size=13, bold=True, color=color)
    add_textbox(slide18, Inches(7.35), ey + Inches(0.7), Inches(5.2), Inches(0.6),
                desc, font_size=10, color=DARK_GRAY)

# Bottom quote
quote_box = add_rounded_rect(slide18, Inches(0.5), Inches(5.9), Inches(12.3), Inches(1.0), NAVY)
add_textbox(slide18, Inches(0.7), Inches(5.95), Inches(12), Inches(0.9),
            '"An enriching internship that transformed academic knowledge into practical expertise — '
            'building a real-world application that can save lives during disasters."',
            font_size=12, italic=True, color=WHITE, align=PP_ALIGN.CENTER)


# ==============================================================================
# SLIDE 19 — ACKNOWLEDGEMENT
# ==============================================================================
slide19 = prs.slides.add_slide(prs.slide_layouts[6])

add_bg_rect(slide19, WHITE)
add_bg_rect(slide19, NAVY, Inches(0), Inches(0), SW, Inches(1.2))
add_textbox(slide19, Inches(0.8), Inches(0.25), Inches(10), Inches(0.7),
            "Acknowledgement", font_size=28, bold=True, color=WHITE)
add_textbox(slide19, Inches(0.8), Inches(0.75), Inches(10), Inches(0.4),
            "Gratitude & Appreciation", font_size=13, color=MED_BLUE)

# Thank you header
add_textbox(slide19, Inches(0.5), Inches(1.5), Inches(12), Inches(0.5),
            "🙏  Thank You!", font_size=32, bold=True, color=NAVY, align=PP_ALIGN.CENTER)

add_textbox(slide19, Inches(0.5), Inches(2.0), Inches(12), Inches(0.5),
            "I would like to express my sincere gratitude to everyone who supported me during this internship journey.",
            font_size=13, color=DARK_GRAY, align=PP_ALIGN.CENTER)

# Acknowledgement cards
acknowledgements = [
    ("🏢", COMPANY_NAME, "For providing the opportunity\nand professional environment", ACCENT_BLUE),
    ("👨‍🏫", MENTOR_NAME, "Industry Mentor — for invaluable\nguidance and support", GREEN),
    ("🏛️", "College Faculty", "For academic support and\ncontinuous encouragement", ORANGE),
    ("🎓", "GTU", "For incorporating internship\nin the curriculum", RED),
    ("👨‍👩‍👧‍👦", "Family & Friends", "For unwavering support\nand motivation", PURPLE),
]

for i, (icon, name, desc, color) in enumerate(acknowledgements):
    col = i % 3
    row = i // 3
    ax = Inches(0.5) + col * Inches(4.15)
    ay = Inches(2.7) + row * Inches(2.1)
    
    acard = add_rounded_rect(slide19, ax, ay, Inches(3.9), Inches(1.85), WHITE, LIGHT_BLUE)
    add_shadow(acard)
    
    # Top bar
    tbar = slide19.shapes.add_shape(MSO_SHAPE.RECTANGLE, ax, ay, Inches(3.9), Inches(0.06))
    tbar.fill.solid(); tbar.fill.fore_color.rgb = color; tbar.line.fill.background()
    
    add_icon_circle(slide19, ax + Inches(1.55), ay + Inches(0.15), Inches(0.6), icon, color, WHITE, 22)
    add_textbox(slide19, ax + Inches(0.2), ay + Inches(0.85), Inches(3.5), Inches(0.3),
                name, font_size=13, bold=True, color=color, align=PP_ALIGN.CENTER)
    add_textbox(slide19, ax + Inches(0.2), ay + Inches(1.15), Inches(3.5), Inches(0.55),
                desc, font_size=9.5, color=DARK_GRAY, align=PP_ALIGN.CENTER)


# ==============================================================================
# SLIDE 20 — THANK YOU / CLOSING
# ==============================================================================
slide20 = prs.slides.add_slide(prs.slide_layouts[6])

# Dark blue gradient background
bg20 = slide20.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SW, SH)
bg20.fill.solid()
bg20.fill.fore_color.rgb = NAVY
bg20.line.fill.background()

# Decorative circles
dc1 = slide20.shapes.add_shape(MSO_SHAPE.OVAL, Inches(-1), Inches(-1), Inches(4), Inches(4))
dc1.fill.solid(); dc1.fill.fore_color.rgb = RGBColor(0x00, 0x3D, 0x7A); dc1.line.fill.background()

dc2 = slide20.shapes.add_shape(MSO_SHAPE.OVAL, Inches(10.5), Inches(5), Inches(4.5), Inches(4.5))
dc2.fill.solid(); dc2.fill.fore_color.rgb = RGBColor(0x00, 0x3D, 0x7A); dc2.line.fill.background()

# Center content
add_textbox(slide20, Inches(0.5), Inches(1.2), Inches(12.3), Inches(0.8),
            "Thank You", font_size=48, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

add_textbox(slide20, Inches(0.5), Inches(2.0), Inches(12.3), Inches(0.5),
            "Questions & Discussion", font_size=20, color=MED_BLUE, align=PP_ALIGN.CENTER)

# Decorative line
dec_line = slide20.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(5.5), Inches(2.6), Inches(2.3), Inches(0.04))
dec_line.fill.solid(); dec_line.fill.fore_color.rgb = ACCENT_BLUE; dec_line.line.fill.background()

# Quote
add_textbox(slide20, Inches(1), Inches(3.0), Inches(11.3), Inches(0.6),
            '"Technology is best when it brings people together." — Matt Mullenweg',
            font_size=16, italic=True, color=RGBColor(0xBB, 0xCC, 0xEE), align=PP_ALIGN.CENTER)

# Contact info cards
contact_data = [
    ("👤", "Presented by", STUDENT_NAME, ACCENT_BLUE),
    ("📧", "Email", "anshpatel@email.com", GREEN),
    ("💼", "LinkedIn", "linkedin.com/in/anshpatel", ORANGE),
    ("💻", "GitHub", "github.com/anshpatel", PURPLE),
]

for i, (icon, label, value, color) in enumerate(contact_data):
    cx = Inches(1.5) + i * Inches(2.8)
    cy = Inches(4.0)
    
    ccard = add_rounded_rect(slide20, cx, cy, Inches(2.5), Inches(1.5), RGBColor(0x00, 0x35, 0x6E))
    
    add_icon_circle(slide20, cx + Inches(0.95), cy + Inches(0.15), Inches(0.55), icon, color, WHITE, 20)
    add_textbox(slide20, cx, cy + Inches(0.75), Inches(2.5), Inches(0.25),
                label, font_size=9, color=MED_BLUE, align=PP_ALIGN.CENTER)
    add_textbox(slide20, cx, cy + Inches(0.95), Inches(2.5), Inches(0.4),
                value, font_size=9, bold=True, color=WHITE, align=PP_ALIGN.CENTER)

# Bottom note
add_textbox(slide20, Inches(0.5), Inches(6.0), Inches(12.3), Inches(0.4),
            f"Internship Presentation | {COMPANY_NAME} | {UNIVERSITY}",
            font_size=11, color=MED_BLUE, align=PP_ALIGN.CENTER)

add_textbox(slide20, Inches(0.5), Inches(6.4), Inches(12.3), Inches(0.4),
            f"{PROJECT_TITLE}  •  {INTERN_DURATION}  •  Presented by {STUDENT_NAME}",
            font_size=10, color=RGBColor(0x88, 0x99, 0xBB), align=PP_ALIGN.CENTER)

# Bottom accent line
bot_line20 = slide20.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0), Inches(7.2), SW, Inches(0.3))
bot_line20.fill.solid(); bot_line20.fill.fore_color.rgb = RGBColor(0x00, 0x35, 0x6E); bot_line20.line.fill.background()


# ── Save ───────────────────────────────────────────────────────────────────────
prs.save(OUT_FILE)
print(f"✅ Presentation saved to: {OUT_FILE}")
print(f"   Total slides: {len(prs.slides)}")
print(f"   Slide dimensions: {prs.slide_width / 914400:.2f}\" x {prs.slide_height / 914400:.2f}\"")
