# Tasks: Дим Димыч хочет в туалет

**Input**: specs/001-toilet-quest/ (spec.md, plan.md, quickstart.md)

## Phase 1: Setup

- [X] T001 Create page shell with canvas, overlay styles and touch-control markup in index.html

## Phase 2: Foundational

- [X] T002 Engine in game.js: scaling to window, rAF loop, keyboard input, state machine (title/intro/room/ending)
- [X] T003 Room framework in game.js: walls, locked/open exit door, player movement + collisions, hearts + hurt + room restart, darkness mask
- [X] T004 Dialogue box in game.js: queued lines with speaker names, choice dialogues, advance on Space/E/tap
- [X] T005 [P] Synth audio in game.js: lazy AudioContext, drone, steps, cry, whisper, chime, thud, mute toggle
- [X] T006 Character drawing in game.js: fixie (round body, antenna hair, white glowing eyes), human figures, fish, Дедус with fangs

## Phase 3: User Story 1 — start to toilet (P1) 🎯 MVP

- [X] T007 [US1] Title + intro (Дим Димыч хочет в туалет, Димон's warning) in game.js
- [X] T008 [US1] Room table with names, backgrounds and Димон hints; progress save/restore and «Начать заново» in game.js
- [X] T009 [US1] Ending «Финал — реальность» at the toilet with credit to Валя in game.js

## Phase 4: User Story 2 — encounters (P1)

- [X] T010 [P] [US2] Нолик (грусть): follows crying, help with action → «спасибо» in game.js
- [X] T011 [P] [US2] Симка (тревожность): 3-round sequence memory with arrow pads in game.js
- [X] T012 [P] [US2] Файер (злость): fireball dodge until anger bar empties in game.js
- [X] T013 [P] [US2] Кусачка (безразличие): choice dialogue in game.js
- [X] T014 [P] [US2] Папа (принятие): talk → flashlight in game.js
- [X] T015 [P] [US2] Мама (любовь): talk → full hearts in game.js
- [X] T016 [P] [US2] Рыбы (раздражение): red light / green light crossing in game.js
- [X] T017 [P] [US2] Ключи (сумасшествие): wobble, control flip, try 5 keys in the lock in game.js
- [X] T018 [P] [US2] Дедус: dark stealth chase with whisper «я тут» in game.js
- [X] T019 [US2] `?room=N` debug skip in game.js

## Phase 5: User Story 3 — phone (P2)

- [X] T020 [US3] Virtual joystick + action button wired to input in game.js / index.html
- [X] T023 [US3] Phone layout: in portrait the canvas sits above the joystick/✋ zone instead of under the controls; «поверни телефон боком» tip on the title (FR-012) in game.js / index.html
- [X] T024 [US1] Controls tutorial room «Спальня» after the intro: Russian instructions for the device in hand (touch vs keyboard), two ticked tasks «походи» + «нажми ✋/пробел», door opens when both done (FR-013) in game.js

## Phase 6: Polish & deploy

- [X] T021 deploy.sh (rsync to aws:~/game_for_valya) + Caddy route and bind mount on the AWS host
- [X] T022 Run quickstart.md validation locally and on https://fluomento.com/game_for_valya/

## Dependencies

T001 → T002 → T003/T004/T005/T006 → US1 → US2 (encounters independent of each other) → US3 → T021 → T022.
All code lives in one file, so [P] marks logical independence, not parallel editing.

## MVP

US1 with room 1 (Нолик) only; then add encounters one by one.
