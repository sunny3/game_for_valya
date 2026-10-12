# game_for_valya

«Дим Димыч хочет в туалет» — a browser horror-quest built from Valya's hand-written design sheet.

Play: https://fluomento.com/game_for_valya/

- Plain HTML + Canvas, no build step: `index.html`, `game.js`.
- Run locally: `python3 -m http.server` and open http://localhost:8000. `?room=N` jumps to room N.
- Deploy: `./deploy.sh` (rsync to `aws:~/game_for_valya`, served by `fluomento-caddy`).
- Spec: `specs/001-toilet-quest/`.
