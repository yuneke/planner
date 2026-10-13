# Planner: plan

A small personal planner for the 16-day break (17 Oct to 1 Nov 2026) that also works for any week or month after it.

## Stack
- Three plain files: `index.html`, `app.js` and `style.css`. No build step and no framework.
- **Supabase** stores the data (Postgres) and handles login with an emailed magic link. The client library loads from a CDN with a pinned version.
- **GitHub Pages** hosts the site, so the same URL works on laptop and phone.
- Light or dark theme follows the system setting. The layout works on both phone and desktop.

## Data (Supabase tables, each row locked to its owner with row-level security)
| table | columns |
|---|---|
| `activities` | id, user_id, title, color, start_time, end_time, date (one-off), repeat_days int[] (0=Sun..6=Sat, null = no repeat), repeat_from, repeat_until, skip_dates date[] |
| `activity_done` | user_id, activity_id, date: one row per completed occurrence |
| `tasks` | id, user_id, title, done, date (null = inbox), period_id (set = period goal), position |
| `periods` | id, user_id, name, start_date, end_date |

Editing only one occurrence of a repeating activity adds that date to its `skip_dates` and creates a one-off copy for that date.

## Screens
1. **Today** (the default screen)
   - Arrows to the previous and next day, a date picker, and a "Today" button.
   - Timeline from 07:00 to 23:00 showing coloured activity blocks, each with a checkbox to tick it done.
   - Task list for the day: add, tick, delete and reorder.
   - Progress for the day: `x / y done (%)`, counting both tasks and activities.
   - **Banner for unfinished tasks:** "3 unfinished from earlier days". Each task gets three buttons: move to today, mark done, delete.
   - **Active period strip:** for example "Half-term break · day 4/16 · goals 2/6", which expands into the goal checklist.
2. **Week**: seven columns (Monday to Sunday) on the same timeline, with the task count shown under each day. It scrolls sideways on a phone.
3. **Month**: a calendar grid where each day shows its activity colours as dots and the share of tasks done. Clicking a day opens it in Today.
4. **Inbox and Periods** (a side panel on desktop, a tab on phone)
   - Inbox: tasks with no date, each with a "schedule" button that gives it a date.
   - Periods: create, edit and delete named periods with dates you choose, each with its own goal checklist.

## Adding and editing activities
- On desktop, drag across empty time on the timeline. The times snap to 15 minutes and a form opens with them filled in.
- On a phone, tap an empty slot. This avoids a drag fighting with page scrolling. The form opens with that hour filled in.
- A "+ Activity" button opens the same form.
- The form fields: title, start, end, a colour from a full colour picker (the browser's built-in picker, with your recently used colours shown as one-tap swatches), repeat weekdays (Mon to Sun checkboxes), and an optional "until" date.
- Clicking a block opens the form for that activity. For a repeating activity, "Save" and "Delete" ask whether to apply to this day only or to the whole series.

## Not included (add later if wanted)
- Reminders and notifications. You chose not to have them.
- Offline use. The page needs an internet connection.
- Hours per category and streaks.

## Setup you'll do (about 10 minutes, I'll write the exact steps)
1. Create a free Supabase project, paste in `schema.sql` (which I'll write), and copy the project URL and anon key into `app.js`.
2. Create a GitHub repo, push the files, and turn on Pages.
3. In Supabase, add the Pages URL as an allowed redirect URL for magic-link login.

Note: Supabase pauses free projects after about 7 days without use. You can unpause in one click from the dashboard, and no data is lost.
