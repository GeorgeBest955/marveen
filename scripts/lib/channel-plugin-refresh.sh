# shellcheck shell=bash
# Refresh the marketplace channel plugins on an EXISTING install
# (SLACKPLUGINVER1006). Sourced by update.sh.
#
# Why: `claude plugin install` runs once, at install time, and nothing ran the
# official update afterwards, so a released plugin version (the slack-channel
# fork's 0.2.x line) reached no existing install; ours got it by hand-copying
# into the cache. Measured 2026-10-15 in a sandbox config dir (Claude Code
# 2.1.300): with the version bumped, `claude plugin marketplace update` then
# `claude plugin update <id>` installs the new version into a NEW cache
# directory and repoints the registry; running sessions keep the version they
# loaded until their next restart.
#
# Guarantees (Samu's review conditions on the card):
#  1. The child `claude` runs outside any channel session and cannot reach a
#     live channel: the channel tokens are removed from its environment and the
#     channel state dirs point at an empty temp dir, so even a plugin server it
#     started would find no token and no bot.pid of the live poller. (Measured
#     in the same sandbox: during `plugin update` only git ran from the plugin
#     directory; no plugin server was started.)
#  2. Only where the plugin is already installed: a config dir whose registry
#     (plugins/installed_plugins.json) lists the id. Never `plugin install`.
#  3. Never fatal: a failing or missing `claude` is logged and skipped; the
#     function always returns 0.

CHANNEL_PLUGIN_REFRESH_IDS="${CHANNEL_PLUGIN_REFRESH_IDS:-slack-channel@marveen-marketplace}"

# The config dirs that can hold a plugin registry: the user-level one, the main
# channel session's, and each agent's. One line each, symlinks resolved, no
# duplicates (a config dir linked to another is refreshed once).
channel_plugin_config_dirs() { # install_dir home
  local d real seen=""
  for d in "$2/.claude" "$1/.channels-config" "$1"/agents/*/.claude-config; do
    [ -d "$d" ] || continue
    real="$(cd -P "$d" 2>/dev/null && pwd)" || continue
    case "
$seen
" in *"
$real
"*) continue ;; esac
    seen="${seen}
${real}"
    printf '%s\n' "$real"
  done
}

# 0 when the config dir's registry lists the plugin id with an install entry.
channel_plugin_installed() { # config_dir plugin_id
  local reg="$1/plugins/installed_plugins.json"
  [ -f "$reg" ] || return 1
  python3 - "$reg" "$2" <<'PY' 2>/dev/null
import json, sys
try:
    entries = json.load(open(sys.argv[1])).get("plugins", {}).get(sys.argv[2])
except Exception:
    sys.exit(1)
sys.exit(0 if isinstance(entries, list) and entries else 1)
PY
}

# One child `claude` call against one config dir, with no channel reachable.
_cpr_claude() { # empty_state_dir config_dir args...
  local empty="$1" cfg="$2"; shift 2
  local to=""
  command -v timeout >/dev/null 2>&1 && to="timeout 300"
  # shellcheck disable=SC2086
  env -u TELEGRAM_BOT_TOKEN -u SLACK_BOT_TOKEN -u SLACK_APP_TOKEN -u DISCORD_BOT_TOKEN \
    CLAUDE_CONFIG_DIR="$cfg" TELEGRAM_STATE_DIR="$empty" SLACK_STATE_DIR="$empty" \
    DISCORD_STATE_DIR="$empty" \
    $to "$CHANNEL_PLUGIN_CLAUDE_BIN" "$@" < /dev/null
}

refresh_channel_plugins() { # install_dir home
  CHANNEL_PLUGIN_CLAUDE_BIN="${CHANNEL_PLUGIN_CLAUDE_BIN:-$(command -v claude 2>/dev/null)}"
  if [ -z "$CHANNEL_PLUGIN_CLAUDE_BIN" ] || [ ! -x "$CHANNEL_PLUGIN_CLAUDE_BIN" ]; then
    echo "  Csatorna-plugin frissites kihagyva: nincs claude parancs"
    return 0
  fi
  local empty cfg id market out rc updated=0 current=0 failed=0
  empty="$(mktemp -d "${TMPDIR:-/tmp}/marveen-plugin-refresh.XXXXXX")" || return 0
  while IFS= read -r cfg; do
    for id in $CHANNEL_PLUGIN_REFRESH_IDS; do
      channel_plugin_installed "$cfg" "$id" || continue
      market="${id#*@}"
      rc=0
      out="$(_cpr_claude "$empty" "$cfg" plugin marketplace update "$market" 2>&1)" || rc=$?
      if [ "$rc" -eq 0 ]; then
        out="$(_cpr_claude "$empty" "$cfg" plugin update "$id" 2>&1)" || rc=$?
      fi
      if [ "$rc" -ne 0 ]; then
        failed=$((failed + 1))
        echo "  FIGYELEM: ${id} frissitese nem sikerult (${cfg}, kilepesi kod ${rc}); a telepitett verzio marad"
        printf '%s\n' "$out" | tail -2 | sed 's/^/    /'
      elif printf '%s' "$out" | grep -q 'updated from'; then
        updated=$((updated + 1))
        echo "  ${id}: $(printf '%s' "$out" | grep -o 'updated from [^ ]* to [^ ]*' | head -1) (${cfg}); a kovetkezo csatorna-indulaskor el"
      else
        current=$((current + 1))
      fi
    done
  done < <(channel_plugin_config_dirs "$1" "$2")
  rm -rf "$empty"
  if [ $((updated + current + failed)) -gt 0 ]; then
    echo "  Csatorna-pluginok: ${updated} frissitve, ${current} naprakesz, ${failed} hibas"
  fi
  return 0
}
