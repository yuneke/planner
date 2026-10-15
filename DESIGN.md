---
name: Planner
description: A dark, personal day planner where every day is three rings to close.
colors:
  ring-schedule: "#FF3B5C"
  ring-tasks: "#B6FF3B"
  ring-goals: "#3BD6FF"
  ground: "#0B0D12"
  surface: "#161A22"
  raised: "#1F2430"
  line: "#262B36"
  text: "#F2F4F8"
  muted: "#8A90A2"
  on-accent: "#0B0D12"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(38px, 6vw, 56px)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 112"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 800
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  block: "10px"
  control: "12px"
  cell: "14px"
  card: "18px"
  dialog: "22px"
  full: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "16px"
  lg: "20px"
components:
  button:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
    height: "36px"
  button-primary:
    backgroundColor: "{colors.ring-tasks}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
    height: "36px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.ring-schedule}"
    rounded: "{rounded.control}"
    padding: "8px 14px"
  input:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "16px"
  legend-chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.full}"
    padding: "6px 12px 6px 8px"
  pill-toggle:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.muted}"
    rounded: "{rounded.block}"
    padding: "0 10px"
    height: "34px"
  pill-toggle-on:
    backgroundColor: "{colors.ring-schedule}"
    rounded: "{rounded.block}"
  checkbox:
    backgroundColor: "transparent"
    rounded: "{rounded.full}"
    size: "24px"
  checkbox-checked:
    backgroundColor: "{colors.ring-tasks}"
    rounded: "{rounded.full}"
    size: "24px"
  month-cell:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.cell}"
    padding: "8px"
    height: "84px"
---

# Design System: Planner

## Overview

**Creative North Star: "Closing Rings"**

Planner treats every day as three activity rings to close: schedule, tasks, period goals. Progress is the headline. The rings sit at the top of the Day view beside a heavy two-line date, and every tick animates an arc forward; a ring that closes fully pulses once. That moment is the reward the whole system is built around.

The world is a near-black, dark-only ground (the owner's choice) with slate surfaces separated by tone rather than borders, three saturated ring colours with fixed jobs, and the user's own activity colours painted at full strength as solid timeline blocks. Heavy, slightly widened Archivo carries dates, numerals and headings; system-ui carries everything you read. Density is moderate: cards breathe, but the timeline is a working instrument at one pixel per minute.

The interface supports the user's colours and never competes with them: chrome stays neutral slate, and the three ring hues appear only where they mean schedule, tasks or goals.

**Key Characteristics:**
- Dark-only near-black ground, tonal slate layering, no light theme.
- Three ring colours with fixed semantic jobs, used as signal, not decoration.
- User activity colours at full strength with auto-contrast text.
- Heavy widened Archivo for dates, numbers and headings; system-ui body.
- Round everything: round checkboxes, round ring caps, generous card radii.
- One expressive ease (fast-out, long settle) for every motion.

## Colors

Near-black slate neutrals carrying three loud, fixed-meaning ring hues.

### Primary
- **Tasks Lime** (ring-tasks): the tasks ring, task checkboxes, the primary button, text caret, selection, the drag-to-create ghost block and the month mini ring. The one action colour.

### Secondary
- **Schedule Red** (ring-schedule): the schedule ring, the current-time line and dot, today's date in Week and Month, the active tab icon, selected pill toggles, destructive text buttons, and the tinted overdue card.

### Tertiary
- **Goals Cyan** (ring-goals): the goals ring, goal dots and goal checkboxes, and every focus indicator (2px outline, 2px offset; input border on focus).

### Neutral
- **Night Ground** (ground): page background, input fields, sticky header (88% with blur on desktop).
- **Slate Surface** (surface): cards, dialogs, legend chips, the view-switcher track.
- **Raised Slate** (raised): default buttons, active tab, month cells, pill toggles; also the base that done timeline blocks mix toward.
- **Hairline** (line): list dividers, input borders, header and tab-bar rules, timeline hour rules and column edges.
- **Bone** (text): primary text and icons.
- **Ash** (muted): secondary text, hour labels, inactive tabs, placeholders.
- **On-Accent** (on-accent): text and check marks on lime fills; equal to ground.

### Named Rules
**The Fixed Jobs Rule.** Red always means schedule, lime always means tasks, cyan always means goals (plus focus). Never use a ring colour for anything that does not belong to its ring.

**The User's Colour Rule.** Activity colours are the user's own, painted at full strength as solid fills. Text on them is chosen by computed WCAG contrast: white or Night Ground, whichever is higher. Never tint, desaturate or outline them to fit the theme; done blocks mix the colour 30% into Raised Slate and switch to Bone text.

## Typography

**Display Font:** Archivo (variable, self-hosted, width axis 62–125%) with system-ui fallback
**Body Font:** system-ui, -apple-system, Segoe UI

**Character:** A heavy, slightly widened grotesk for anything that counts or names (dates, numerals, headings) against a quiet native body face for everything that is read.

### Hierarchy
- **Display** (900, width 112%, clamp(38px, 6vw, 56px), 0.95): the two-line hero date only. The auth wordmark uses the same cut at 40px.
- **Headline** (800, 22px): dialog titles; the view title in the header at 20–22px.
- **Title** (800, 18px): card headings. Month day numbers (800, 16px; 13px on phone) and week day heads (15px) use Archivo too.
- **Body** (400, 15px, 1.4): list items, inputs, buttons (buttons at 600).
- **Label** (600, 12px): field labels, fieldset legends, weekday headers; hour labels at 11px; block text 13px with 700 titles.

### Named Rules
**The Counting Face Rule.** Numbers that report progress (legend counts, dates, day numbers) are Archivo with tabular figures where they align. Body copy is never Archivo.

## Layout

Single column on phone, growing to a main column plus a 330px Lists column at 1000px and up (max width 1360px, 20px gutters and gaps). Within Day, tasks and schedule sit side by side from 760px (schedule fluid, tasks a 340px sticky column at top 80px). Below 1000px Lists replaces the main column as its own view. At 700px and below the header loses its blur, the view switcher becomes a fixed bottom tab bar (icon over 11px label, safe-area padded), and the layout gains 96px bottom padding to clear it.

Spacing runs on a small set: 6 and 8px inside controls, 12–16px inside cards and between stacked cards, 20px page gutters (14px on phone).

The timeline runs 09:00–23:00 and stretches to fill whatever height is left (the page never scrolls; positions are percentages of the 14-hour span), with a 46px hour gutter and equal day columns. Hour rules are a repeating linear gradient every 1/14 of the height; this is functional geometry, not decoration. On phones every other hour label is hidden, and blocks shorter than 36px show only their title. Week view scrolls horizontally with a 780px minimum width.

## Elevation & Depth

Depth is mostly tonal: Night Ground, Slate Surface, Raised Slate step up in lightness, and nearly nothing carries a border. One soft, deep, offset-down shadow sits under cards; dialogs get a larger version and a dimmed, lightly blurred backdrop.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 10px 30px -18px rgb(0 0 0 / .9)`): every card; reads as weight, not glow.
- **Dialog** (`box-shadow: 0 30px 80px -20px rgb(0 0 0 / .9)`): modal dialogs only.
- **Next ring** (`box-shadow: 0 0 0 2px #F2F4F8`): the next upcoming timeline block on today. A state ring, not elevation.

### Named Rules
**The Tone Before Line Rule.** Separate layers by surface tone first. Hairlines are for list dividers, inputs and structural edges (header, tab bar, timeline), not for outlining cards.

## Shapes

Everything is soft and round. Radii step with size: 10px for timeline blocks and pill toggles, 12px for buttons and inputs, 14px for month cells and the switcher track, 18px for cards, 22px for dialogs, fully round for chips, checkboxes, icon buttons, colour swatches and dots. Ring strokes are 14px with round caps. Icons are drawn line SVG, 18px on a 24 grid, 2.2 stroke, round caps and joins.

## Components

### Rings Hero (signature)
Three concentric SVG rings (radii 57/41/25 in a 132-unit viewBox drawn at 104px, 76px on phones, 14px stroke, round caps, rotated to start at 12 o'clock): schedule outside, tasks, goals inside. Tracks are the ring colour at 20% opacity. Arcs animate stroke-dashoffset over 1.1s on the house ease from their previous value. A ring that reaches 100% plays one pop (stroke swells to 19px with a soft same-colour glow, 0.7s, after the 1s fill). Beside it: the Display date in two lines, a muted period line, and a "Next:" line with the activity's colour dot; the legend chips sit at the row's right edge (below it on phones). The day's task list lives in the side column under Inbox and Periods (the Lists tab on phones).

### Legend Chips
Fully round Slate Surface chips: 10px colour dot, Archivo 15px count in Bone with tabular figures, muted 13px label. One per ring, under the hero.

### Buttons
- **Shape:** 12px radius, 36px minimum height, 600 weight, icon + label with 6px gap.
- **Default:** Raised Slate fill, Bone text; hover lightens one step.
- **Primary:** Tasks Lime with On-Accent text; one per region at most (Add Activity, Save).
- **Ghost / Danger:** transparent; muted or Schedule Red text, filling on hover.
- **Icon:** 32px circle, transparent, muted icon; Raised Slate on hover.
- **Press:** scale to 0.96 on the house ease. Disabled at 25% opacity.

### Cards / Collapsibles
- **Corner Style:** 18px. **Background:** Slate Surface. **Shadow:** Card. **Padding:** 16px.
- Collapsible cards use a drawn chevron (2px muted stroke) that rotates on open. The overdue card is tinted with Schedule Red at 10% over Slate Surface.

### Inputs / Fields
- **Style:** Night Ground fill, 1px Hairline border, 12px radius, 40px height, lime caret.
- **Focus:** border turns Goals Cyan; no glow.
- Labels sit above at 12px/600 muted.

### Checkboxes
Round, 24px, 2px Tasks Lime ring; checking fills lime and scales in a drawn check mark (On-Accent). Press scales to 0.85. Goal checkboxes swap lime for Goals Cyan. Inside timeline blocks they shrink to 18px and use the block's own contrast colour.

### Pill Toggles
Hidden native inputs with a 34px, 10px-radius Raised Slate label (muted, 600, 13px). Checked fills Schedule Red. Used for repeat weekdays in the activity dialog.

### Timeline Blocks
Absolutely positioned on the minute grid; 10px radius, a 2px Slate Surface border to separate neighbours, full user colour fill with auto-contrast text (700 title, 500 tabular time). Under 80px wide the checkbox and time hide. **Done:** colour mixed 30% into Raised Slate, Bone text, title struck through. **Next:** a 2px Bone ring. The current time is a 2px Schedule Red line with a 10px dot. Drag-to-create shows a lime 18% ghost with a 2px dashed lime border.

### Unplaced & Plan the day
Activities without a time live in an **Unplaced** list: a 272px side column inside the Schedule card on laptop (hairline left rule), and a collapsible card above the schedule on phone. The list rows match task rows, but each checkbox is tinted with the activity's own colour and the duration is a muted tabular label (`1h30`). A full-width lime **Plan the day** button and a one-line quick add ("Add to plan… e.g. Gym 2h") sit above the list. On today the hero adds "N to place · Plan now" with a lime link. The plan dialog steps through one activity at a time:
- a 28px Archivo title with a colour dot;
- a 24px tabular time readout in a Night Ground well, flanked by 44px ◀ ▶ nudges;
- a horizontal 09–23 day strip where placed blocks sit at 40% colour and the proposed block is full colour with a 2px Bone ring, sliding as it is nudged.

It ends on a 32px "Day planned" moment showing the filled strip. In Week view, each day header carries up to three colour-dot chips (999px radius, Raised Slate) and a small + that opens a one-line add.

### Month Cells
84px (58px phone) Raised Slate tiles, 14px radius; out-of-month days transparent and muted. Each carries the Archivo day number (today on a Schedule Red pill), a mini tasks ring (22px conic gradient masked to a ring; 14px on phone) and colour dots for the day's activities.

### Navigation
Desktop: a segmented switcher in the sticky header (Slate Surface track, 4px inset, active segment Raised Slate with a Schedule Red icon). Phone (700px and below): fixed bottom tab bar on a slightly darker slate with a top hairline, icon over 11px label, active tab in Bone with red icon.

### Motion
One ease for everything: cubic-bezier(.16, 1, .3, 1). Controls 0.15–0.25s, dialogs rise 12px and fade in over 0.3s, ring fills 1.1s. Reduced motion collapses all durations.

## Do's and Don'ts

### Do:
- **Do** keep each ring colour on its fixed job: red schedule, lime tasks, cyan goals and focus.
- **Do** paint activity blocks in the user's colour at full strength and pick the text colour by computed contrast.
- **Do** animate progress: rings fill from their previous value on every tick, and a closed ring pops once.
- **Do** set dates, counts and headings in heavy Archivo; keep reading text in system-ui.
- **Do** separate layers by tone (ground, surface, raised) and keep shadows soft and offset downward.
- **Do** keep checkboxes round and use drawn line SVG icons at 2.2 stroke.

### Don't:
- **Don't** add a light theme or light surfaces; the world is dark-only by the owner's choice.
- **Don't** hide progress in small "x/y" text alone; counts accompany the rings, they do not replace them.
- **Don't** use a ring colour decoratively or for a meaning outside its ring.
- **Don't** recolour, desaturate or outline the user's activity colours to match the chrome.
- **Don't** outline cards with borders; tone does that job.
