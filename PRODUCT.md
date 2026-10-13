# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
A single student (the owner) planning their own time: first a 16-day school break (17 Oct – 1 Nov 2026), then ordinary weeks and months. Opens it in the morning to plan the day and in the evening to tick things off and set up tomorrow, on both laptop and phone.

## Product Purpose
A personal planner that combines a timed schedule (e.g. Gym 9–11, Maths 4–6, Football 6:30–9) with a daily to-do list (e.g. read 30 pages, sign paperwork), plus goals for longer named periods. Success: the owner actually keeps using it through the break and feels pushed forward by seeing progress.

## Operating Context
- Morning: look at today, adjust the schedule, add tasks.
- Evening: tick off activities and tasks, move unfinished tasks forward, glance at the week.
- Laptop (drag to create on the timeline) and phone (tap to create), synced through Supabase.

## Capabilities and Constraints
- Views: Day (default), Week, Month; Inbox and Periods list.
- Activities: title, start/end, any custom colour, optional weekly repeat with end date, per-occurrence done tick, edit "this day only" or "every day".
- Tasks: title + done, ordered; dated, inbox (no date) or a period goal.
- Unfinished tasks from earlier days are offered (move to today / done / delete), never moved automatically.
- Timeline 09:00–23:00. Weeks start Monday.
- Stack: static HTML/CSS/JS (no build), Supabase (auth by email magic link + Postgres), GitHub Pages hosting. Online-only.
- No reminders, no streaks, no per-category stats (deliberately out of scope).

## Brand Commitments
Name: "Planner". The owner asked for an energetic, motivating feel, and gave free rein to redesign the layout as long as the features stay. Activity colours are the user's own and must stay legible on any theme.

## Product Principles
1. Today first: opening the app answers "what's next and how am I doing" in one glance.
2. Progress should feel rewarding: ticking something off is the moment the product earns its place.
3. Fast capture: adding an activity or task is one gesture or one line.
4. The user's colours carry the schedule; the interface supports them, never competes.
5. Works equally on phone and laptop, morning light and evening dark.
