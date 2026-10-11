# Implementation Plan: Дим Димыч хочет в туалет

**Branch**: `001-toilet-quest` | **Date**: 2026-10-12 | **Spec**: [spec.md](spec.md)

## Summary

A single static web page with a Canvas 2D top-down game. One room = one screen; a room table
drives the game, each room owns an encounter object with `update/draw/onAction`. Graphics and
sounds are generated in code. Served by the existing Caddy on the fluomento AWS host at
`https://fluomento.com/game_for_valya/`.

## Technical Context

**Language/Version**: JavaScript (ES2020), HTML5
**Primary Dependencies**: none (Canvas 2D, WebAudio, localStorage)
**Storage**: localStorage key `valya_game_room` (progress only; game works if it throws)
**Testing**: manual playthrough + `?room=N` debug skip; headless check that the page loads with no console errors
**Target Platform**: modern desktop and mobile browsers
**Project Type**: static web game
**Performance Goals**: 60 fps on a phone, page < 100 KB
**Constraints**: no network calls at runtime, no build step
**Scale/Scope**: 9 rooms + intro + ending

## Constitution Check

| Principle | Status |
|-----------|--------|
| I. Author's vision first | ✅ every sheet item mapped to a room (spec US2) |
| II. Kid-appropriate spooky | ✅ no gore; sounds via soft envelopes, master gain ≤ 0.35 |
| III. Zero-install | ✅ static files only |
| IV. Russian UI | ✅ all strings in Russian |
| V. Original art only | ✅ shapes + synth audio |

## Project Structure

```text
specs/001-toilet-quest/   # spec, plan, tasks
index.html                # page shell, canvas, touch controls, styles
game.js                   # engine, rooms, encounters, audio
deploy.sh                 # rsync to aws:~/game_for_valya
```

## Design

- **Logical resolution** 480×320 scaled to fit the window (letterboxed), crisp pixels.
- **Loop**: `requestAnimationFrame`, dt clamped to 50 ms.
- **State machine**: `title → intro → room(i) → ending`. A dialogue box overlays any state and
  pauses movement; Space/E/tap advances it.
- **Room**: `{name, bg, dark, hint, enc}`; walls = border rect; exit door on the right wall,
  locked until `enc.done`. Entering the open door → next room, progress saved.
- **Darkness**: radial gradient mask around the player; radius grows after Папа's flashlight.
- **Hearts**: 3; `hurt()` gives 1 s invulnerability; 0 hearts → room restart.
- **Encounters**: Nolik (follow + help), Simka (sequence memory with 4 arrow pads), Fire
  (fireball dodge 25 s), Kusachka (dialogue choices), Papa (talk → flashlight), Mama (talk →
  heal), Fish (red light / green light), Keys (5 keys, wobble + periodic control flip), Dedus
  (stealth chase in the dark with whisper).
- **Audio**: lazily created AudioContext on first input; drone, steps, cry (vibrato sine),
  whisper (band-passed noise), success chime, hurt thud. Mute toggle (M / 🔊 button).
- **Touch**: virtual joystick (left half) + action button; shown on `pointer: coarse`.

## Deployment

Caddy route in `fluomento.com` site block:
`handle_path /game_for_valya/* { root * /srv/game_for_valya; file_server }` and a redirect of
`/game_for_valya` → `/game_for_valya/`. The caddy service gets a read-only bind mount
`/home/ubuntu/game_for_valya:/srv/game_for_valya`. Recreate only caddy (`--no-deps`).
