# Quickstart: validate the game

1. Local: `cd ~/game_for_valya && python3 -m http.server 8765`, open http://localhost:8765/.
2. Title → «Играть» → intro shows Дим Димыч + Димон. Room 1 door is closed.
3. `?room=N` (1–9) jumps to an encounter; resolve it, the door opens, walking through goes to N+1.
4. `?room=9`, finish → ending «Финал — реальность», credit to Валя.
5. Lose all hearts in room 3 (Файер) → room restarts, progress kept.
6. Phone viewport 390×844: joystick + action button visible, room 1 completable.
7. Prod: https://fluomento.com/game_for_valya/ returns 200 and the game loads with no console errors.
