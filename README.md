# HabitCrafts Prototype

This is the **design-exploration prototype** for the HabitCrafts redesign. It is a
sandbox for research, design thinking, and clickable static mockups — nothing in
this repo ships directly to users.

The **production app** is the Flutter repo at
[`Mark-lichman/HabitCrafts`](https://github.com/Mark-lichman/HabitCrafts). Any design
direction validated here gets re-implemented there in Flutter.

## What lives here

- `docs/` — the design research brief and design recommendations that drive the redesign.
- `prototype/` — static HTML/CSS/JS prototypes of the key screens, for both mobile and
  desktop-web layouts.
- `assets/images/` — brand assets (logos, icons, onboarding art, backgrounds) copied from
  the production Flutter app so the prototypes look like the real product.

## How to view

No build step, no dependencies. Open the entry page directly in a browser:

```
prototype/index.html
```

Double-click the file, or from the repo root run:

```sh
# macOS
open prototype/index.html

# Windows (PowerShell)
start prototype\index.html
```

Optionally, serve it locally if you want relative paths and any future fetch calls to
behave like production:

```sh
python -m http.server 8000
# then visit http://localhost:8000/prototype/
```

## Screens (placeholder list)

These are the screens planned for the prototype. This list is a placeholder and will be
updated as screens are built.

- Onboarding / welcome
- Sign up & sign in
- Home / today dashboard
- Habit detail & check-in
- Create / edit habit
- Goals
- Groups & group detail
- Progress & streak stats
- Notifications
- Profile & settings

Each screen is intended to exist in both a mobile layout and a desktop-web layout.

## Status

Early scaffold. The research brief and prototype screens are in progress.
