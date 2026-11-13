#!/bin/bash
# Registers once (needs RUNNER_TOKEN, a one-hour registration token), keeps the registration
# in /state so the container can be recreated without a new token, then runs the listener.
set -euo pipefail
cd /home/runner
STATE=/state
FILES=(.runner .credentials .credentials_rsaparams)

if [ ! -f "$STATE/.runner" ]; then
  : "${RUNNER_URL:?RUNNER_URL ontbreekt}"
  : "${RUNNER_TOKEN:?Geen registratie in /state en geen RUNNER_TOKEN}"
  ./config.sh --unattended --replace \
    --url "$RUNNER_URL" --token "$RUNNER_TOKEN" \
    --name "${RUNNER_NAME:-gde-beast}" --labels "${RUNNER_LABELS:-gde-build}" \
    --work _work
  for f in "${FILES[@]}"; do cp "$f" "$STATE/$f"; done
  chmod 600 "$STATE"/.credentials*
  echo "Geregistreerd; staat bewaard in $STATE."
else
  for f in "${FILES[@]}"; do cp "$STATE/$f" "$f"; done
fi

if [ "${1:-}" = "register-only" ]; then exit 0; fi
exec ./run.sh
