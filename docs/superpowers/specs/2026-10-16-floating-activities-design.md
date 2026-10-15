# Floating activities and Plan the day

## Intent

The user plans a day by first listing what they want to do, without times. Those activities float on that day, unplaced. On that day's morning (or any earlier day) they go through the list and give each one a time, which turns the list into the day's schedule.

Success: listing tomorrow takes seconds, and planning the morning is a short, satisfying ritual that ends with a full timeline.

## Decisions (from the user)

| Question | Answer |
|---|---|
| Floating vs tasks | A floating activity is an activity waiting for a time. Once placed it is a normal timed block. Tasks stay separate. |
| Duration | Optional. Placing uses it; without one, 1 hour. |
| Unplaced at end of day | Offered in the "unfinished from earlier days" banner (Today / Delete). Never moved automatically. |
| Repeats | No. Floating activities are one-off. |
| Placement (laptop) | An "Unplaced" side column next to the timeline. |
| Placement (phone) | A collapsible "Unplaced (N)" card above the schedule, closed by default. |
| Giving it a time | A Plan-the-day step-through screen. |
| Picking the time | Suggested next free slot, nudged ±15 min, with a mini timeline. |
| Entry to planning | A "Plan the day" button, plus a nudge in the hero on today. |
| Adding | A quick-add line on the day, and a strip under each day in Week view. |
| Colour | Reused from an earlier activity with the same title, else the most recent colour. |
| Schedule ring | Unplaced activities count as not done. They can be ticked done without a time. |
| Plan order | The user's order in the Unplaced list, rearranged with up/down. |

## Data

New file `plans.sql`, run once in the Supabase SQL Editor after `schema.sql`:

```sql
alter table activities
  alter column start_time drop not null,
  alter column end_time drop not null,
  add column duration int check (duration between 5 and 840),  -- minutes, for unplaced activities
  add column position double precision not null default 0,
  add constraint placed_or_not check ((start_time is null) = (end_time is null)),
  add constraint unplaced_once check (start_time is not null or repeat_days is null);
```

The existing `end_time > start_time` check passes when both are null (null is not false).

An activity is **unplaced** when `start_time` is null. Placing it sets `start_time` and `end_time`; `duration` stays as it was and is ignored once placed.

## Code (app.js)

- `activitiesOn(s)` still returns every activity for the day, and its sort puts unplaced activities last, in `position` order.
- New helpers: `placedOn(s)` returns activities with a time, and `unplacedOn(s)` returns the unplaced ones in position order.
- `column()`/`layout()` and `nextActivity()` use `placedOn`. Month dots and the ring keep using `activitiesOn`, so unplaced activities count.
- `parseQuick(text)` turns `"Gym 2h"`, `"Maths 90m"` and `"Call mum 1h30"` into `{ title, duration }`. Only a trailing duration token is read; anything else stays in the title. With no duration, `duration` is null.
- `colourFor(title)` returns the colour of the most recent activity with the same title (case-insensitive), else the most recent colour, else `#ff3b5c`.
- `suggestSlot(s, duration, after)` returns the earliest start ≥ `after`, snapped to 15 min, where `[start, start+duration)` overlaps no placed activity and ends by 23:00. If nothing fits it returns `null`. `after` = max(09:00, end of the item last placed in this session, now rounded up to 15 min if `s` is today).

## Interface

All styling uses the existing tokens and components (`card`, `chip`-like pills, `button.primary`, the timeline block style, `onColor`). No new colours.

### Day view
- **Laptop (the Schedule card is wide enough):** the timeline and a narrow **Unplaced** column sit side by side. Column header: "Unplaced" with a count, and a **Plan the day** primary button when it isn't empty. Below that, an "Add to plan… e.g. Gym 2h" input (one line, Enter adds). Then the list. Each item shows a colour dot, the title, the duration (`2h`, `1h30`), a done checkbox, and up/down buttons. Tapping the title opens the edit dialog.
- **Phone:** the same content in a `collapsible` card titled "Unplaced (N)" above the Schedule card, closed by default. It is always present so the quick add is reachable, and reads "Nothing to place" when empty.
- **Hero nudge:** when the cursor is today and it has unplaced activities, the hero shows "N to place · Plan now", where "Plan now" opens the plan screen.

### Plan the day (dialog)
- **Header:** "Plan {weekday}" and "{i} of {n}".
- **Body:** the title (with its colour), the duration, and a control **◀ 10:00 – 12:00 ▶** where the arrows move the start by 15 min. A mini timeline of the day shows the placed blocks, with the proposed block highlighted in the activity's colour. If no slot fits, it reads "Nothing free before 23:00. Nudge it into place or skip." and starts at the latest start that ends by 23:00.
- **Buttons:**
  - **Back** goes to the previous item and, if that item was placed in this session, makes it unplaced again so it can be re-picked.
  - **Skip** leaves the item unplaced and moves on.
  - **Place →** saves the start and end immediately and moves on.
- **End:** after the last item, the dialog shows "Day planned" with the count placed and a **Done** button, and the schedule ring animates as the day view re-renders.
- **Keyboard:** ←/→ nudge, Enter places, Esc closes. Closing midway keeps everything already placed.

### Week view
Under each day header, a strip shows up to 3 unplaced chips, then "+N", and a small **+**. The + swaps in a one-line input for that day: Enter adds, Esc cancels. Tapping a chip opens that day.

### Leftovers
`overdueBanner()` also lists unplaced activities dated before today, each with **Today** (moves its date) and **Delete**. "Move all to today" moves both tasks and unplaced activities.

### Editing an unplaced activity
`editActivity` for an unplaced activity shows Title, Date, Duration (minutes, optional) and Colour, with no Start/End and no Repeat. Delete works as before.

## Error handling
- Every save goes through the existing `save()`, which alerts on failure and reloads.
- If `plans.sql` hasn't been run, inserting with null times fails with the database's error. SETUP.md gets a step for it.

## Testing (test/)
- `parseQuick`: `"Gym 2h"` gives (Gym, 120), `"Maths 90m"` gives (Maths, 90), `"Call mum 1h30"` gives (Call mum, 90), `"Read"` gives (Read, null), and `"Room 101"` keeps the number in the title.
- `suggestSlot`: it skips a busy block, respects `after`, and returns null when the day is full.
- Quick add creates an unplaced activity that shows in the Unplaced list, not on the timeline.
- The ring counts unplaced activities as not done.
- The plan screen: Place sets times and the block appears on the timeline; Skip leaves the item unplaced.
- The leftovers banner shows a past unplaced activity.
- Screenshots of the Day view and the plan dialog at laptop and phone sizes, and of the Week view.

## Out of scope
Dragging chips onto the timeline, unplacing an activity from the timeline (other than Back in the plan screen), repeating floating activities, and automatic pop-ups.
