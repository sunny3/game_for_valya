#!/bin/sh
# Ship the static game to the fluomento AWS host; Caddy serves it at https://fluomento.com/game_for_valya/
set -e
cd "$(dirname "$0")"
rsync -av --delete index.html game.js aws:game_for_valya/
