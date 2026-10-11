# Feature Specification: Дим Димыч хочет в туалет (toilet quest)

**Feature Branch**: `001-toilet-quest`
**Created**: 2026-10-12
**Status**: Implemented
**Input**: Hand-written design sheet by Valya (schoolboy), photo `~/Downloads/2026-10-12 02.09.35.jpg`.
Follow-up request (2026-10-12): mobile version on the site + a Russian onboarding on how to control the character.

## Source design sheet (transcribed)

1. Начало игры — Дим Димыч хочет в туалет.
2. Персонажи: Димон — тех. инженер безопасности фиксиков; Злой Нолик — синий; Злой Симка —
   оранжевый; Злой Fire — красный; Злой Кусачка; Папа — союзник; Мама — любовь (награда);
   Рыбы — подозрительно спокойно; Квест с подбором ключей; Злой Дед — Дедус. Финал — реальность (туалет).
3. Нолик — грусть: «стой, спаси меня, не убегай», звуки плача → «спасибо».
4. Оранжевый — тревожность: «мне плохо», «стой, мы будем делать одно и то же», «ааа».
5. Злость: «ты никуда не убежишь», «у тебя ничего не получится» → «я злой».
6. Кусачка → безразличие. 7. Папа → принятие. 8. Мама → любовь.
9. Рыбы — раздражение. 10. Квест → сумасшествие. 11. Дед с клыками → шёпот «я тут».

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Play from start to the toilet (Priority: P1)

A child opens the game link, reads the intro (Дим Димыч wakes up at night and wants to go to the
toilet; Димон, the fixies' safety engineer, warns that the fixies have turned evil), learns the
controls in a short tutorial in the bedroom, and walks Дим Димыч through the house room by room.
Each room holds one character from the sheet, in the sheet's order; the room's exit opens only
after the encounter is resolved. The last door leads to the toilet and the "reality" ending.

**Why this priority**: this is the whole game the author designed.

**Independent Test**: play from the title screen to the ending screen without reloading.

**Acceptance Scenarios**:

1. **Given** the title screen, **When** the player presses «Играть», **Then** the intro shows
   Дим Димыч wanting to go to the toilet and Димон's warning.
2. **Given** the intro is over, **When** the tutorial starts, **Then** a Russian panel explains the
   controls for the current device and the door opens only after the player walked and pressed ✋/пробел.
3. **Given** any room, **When** its encounter is not resolved, **Then** its exit door stays closed.
4. **Given** the last room is resolved, **When** the player enters the toilet, **Then** the ending
   «Финал — реальность» shows, crediting Валя as the author of the idea.

### User Story 2 — Each character feels like its emotion (Priority: P1)

Every encounter has a mechanic that matches the emotion from the sheet and uses the sheet's lines:

| # | Character | Emotion | Encounter |
|---|-----------|---------|-----------|
| 1 | Нолик (blue) | грусть | Follows you crying «стой, спаси меня, не убегай». Running away doesn't work — walk up to him and help (action button) → «спасибо». |
| 2 | Симка (orange) | тревожность | «мне плохо… стой, мы будем делать одно и то же». Repeat her sequence of moves (memory game, 3 rounds). A mistake → «ааа!» and the round restarts. |
| 3 | Файер (red) | злость | «ты никуда не убежишь!», «у тебя ничего не получится!». Dodge his fireballs until his anger burns out → «я злой… просто злой». |
| 4 | Кусачка | безразличие | Blocks the door. Dialogue choices — she answers «мне всё равно» to everything until the player chooses the accepting answer. |
| 5 | Папа | принятие (союзник) | Talks about accepting feelings and gives a flashlight (wider light in the dark rooms). |
| 6 | Мама | любовь (награда) | Hugs Дим Димыч: restores all hearts and adds a 4th heart. |
| 7 | Рыбы | подозрительно спокойно → раздражение | Cross the aquarium room; move only while the fish are calm. Moving while they are irritated costs a heart and sends you back. |
| 8 | Квест с ключами | сумасшествие | Several keys lie in a wobbling, colour-shifting room; controls sometimes flip. Try keys in the lock until the right one opens it. |
| 9 | Дедус с клыками | шёпот «я тут» | Dark corridor; Дедус appears near you whispering «я тут». Reach the toilet door without being caught; caught → lose a heart, back to the start of the room. |

**Independent Test**: each encounter can be reached via a debug room-skip and resolved on its own.

### User Story 3 — Plays on a phone (Priority: P2)

The author and his friends can play on a phone: on-screen joystick and action button, the game
area fits the screen in portrait (picture above the controls) and landscape.

**Independent Test**: complete the tutorial and room 1 on a 390×844 touch viewport.

### Edge Cases

- All hearts lost → the current room restarts with full hearts (no game over, no lost progress).
- Window resized / phone rotated mid-game → the game rescales without losing state.
- Sound blocked until first tap → sound starts after the first interaction; game works muted.
- Reload → progress is remembered (continue from the last reached room), with «Начать заново».

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The game MUST start with a title screen and an intro stating that Дим Димыч wants to go to the toilet.
- **FR-002**: The game MUST present the 9 encounters in the sheet's order (Нолик, Симка, Файер, Кусачка, Папа, Мама, Рыбы, Ключи, Дедус), one per room.
- **FR-003**: Each encounter MUST use the dialogue lines from the sheet listed in User Story 2.
- **FR-004**: A room's exit MUST open only after its encounter is resolved.
- **FR-005**: The player MUST have 3 hearts; losing all restarts the current room only.
- **FR-006**: The game MUST end with the "reality" ending at the toilet, crediting Валя.
- **FR-007**: The game MUST be playable with keyboard (arrows/WASD + Space/E) and with touch controls.
- **FR-008**: All text MUST be in Russian.
- **FR-009**: Sounds (crying, whispers, ambience, steps) MUST be quiet-to-moderate; no sudden loud scares.
- **FR-010**: Progress (last reached room) MUST survive a page reload, with an option to start over.
- **FR-011**: Димон MUST appear in the intro and give a one-line hint at the start of each room.
- **FR-012**: On a phone held upright the game picture MUST sit above the joystick and ✋ button, never under them; the title MUST suggest turning the phone sideways.
- **FR-013**: Before room 1 a tutorial MUST teach, in Russian, how to control Дим Димыч on the device in hand (touch: joystick + ✋ + tap to read on; keyboard: arrows/WASD + Space/E + M), and the way on opens only after the player has walked and pressed the action button.

### Key Entities

- **Room**: a screen with walls, an exit door, one encounter, a hint from Димон.
- **Encounter**: character, emotion, lines, win condition.
- **Player**: Дим Димыч, position, hearts, has-flashlight.

## Success Criteria *(mandatory)*

- **SC-001**: A first-time player completes the game in 8–20 minutes.
- **SC-002**: The game loads and becomes playable in under 3 seconds on a phone connection.
- **SC-003**: Every one of the 11 numbered items on the design sheet is visible in the game.
- **SC-004**: The game is completable on both a desktop browser and a phone.

## Assumptions

- "Фиксики" names are used as a private fan game for the author; all art is original, drawn in code.
- The circled note «у Нолика/фиксика … белый Альбо» is read as: evil fixies have glowing white eyes. Low-confidence reading.
- "Финал — реальность": Дим Димыч finally reaches the real toilet; the evil-fixie night was the scary part on the way.
- Difficulty is tuned for a ~10-year-old: forgiving hit boxes, no timers that can fail the whole game.
