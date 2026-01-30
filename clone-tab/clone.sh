#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$SCRIPT_DIR/clone.log"
exec > >(tee -a "$LOG_FILE") 2>&1
cd "$SCRIPT_DIR"

echo "=============================="
echo "Clone started: $(date)"
echo "=============================="

# DEVICE CHECK
COUNT=$(adb devices | grep -w device | wc -l)
[ "$COUNT" -eq 1 ] || { echo "❌ Connect exactly ONE tablet"; exit 1; }

# DATE & TIME
adb shell settings put system time_12_24 24
adb shell settings put global auto_time 0
adb shell settings put global auto_time_zone 0

# ORIENTATION
adb shell settings put system accelerometer_rotation 0
adb shell settings put system user_rotation 1

# SCREEN TIMEOUT
adb shell settings put system screen_off_timeout 2147483647

# SOUND (REALISTIC)
adb shell cmd media_session dispatch play || true
sleep 1
adb shell cmd media_session volume --stream 3 --set 12
adb shell settings put global zen_mode 1
adb shell settings put system vibrate_when_ringing 0
adb shell settings put system haptic_feedback_enabled 0
adb shell settings put system sound_effects_enabled 0
adb shell settings put system lockscreen_sounds_enabled 0
adb shell settings put system charging_sounds_enabled 0
adb shell settings put system dtmf_tone 0

# DEV OPTIONS
adb shell settings put global development_settings_enabled 1

# LOCKSCREEN
adb shell locksettings clear || true

# WALLPAPER (WORKING METHOD)
WALL_LOCAL="$SCRIPT_DIR/pagoda.jpg"
WALL_REMOTE="/sdcard/pagoda.jpg"
[ -f "$WALL_LOCAL" ] || { echo "❌ pagoda.jpg missing"; exit 1; }

adb push "$WALL_LOCAL" "$WALL_REMOTE"
adb shell am broadcast \
  -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
  -d "file://$WALL_REMOTE"

adb shell am start \
  -a android.intent.action.ATTACH_DATA \
  -d "file://$WALL_REMOTE" \
  -t "image/jpeg"

echo "👉 Choose Photos/Gallery → Set wallpaper (one tap)"

# ---------------- MEDIA COPY (FIXED) ----------------
# Use first argument as source if provided, else default
SRC="${1:-/Volumes/NK-Working/Dummy}"
DEST="/sdcard"

[ -d "$SRC" ] || { echo "❌ Source media missing: $SRC"; exit 1; }

adb shell mkdir -p /sdcard/media

command -v adb-sync >/dev/null || { echo "❌ adb-sync not installed"; exit 1; }

adb-sync -f "$SRC" "$DEST"
# ---------------------------------------------------

echo "=============================="
echo "Clone completed: $(date)"
echo "Log: $LOG_FILE"
echo "=============================="

