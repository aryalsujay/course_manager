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

# Check if remote file exists and calculate hash
NEED_WALLPAPER=true
if adb shell "[ -f '$WALL_REMOTE' ]"; then
    # Calculate md5sums (awk to get just the hash)
    LOCAL_SUM=$(md5 -q "$WALL_LOCAL" 2>/dev/null || md5sum "$WALL_LOCAL" | awk '{print $1}')
    # Android md5sum output: "hash  filename"
    REMOTE_SUM=$(adb shell md5sum "$WALL_REMOTE" | awk '{print $1}')
    
    if [ "$LOCAL_SUM" == "$REMOTE_SUM" ]; then
        echo "✅ Wallpaper already set (Hash Match). Skipping setup."
        NEED_WALLPAPER=false
    fi
fi

if [ "$NEED_WALLPAPER" = true ]; then
    echo "🎨 Setting Wallpaper..."
    adb push "$WALL_LOCAL" "$WALL_REMOTE"
    adb shell am broadcast \
      -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
      -d "file://$WALL_REMOTE"
    
    adb shell am start \
      -a android.intent.action.ATTACH_DATA \
      -d "file://$WALL_REMOTE" \
      -t "image/jpeg"
      
    echo "👉 Choose Photos/Gallery → Set wallpaper (one tap)"
fi

# ---------------- MEDIA COPY (FIXED) ----------------
# Use first argument as source if provided, else default
SRC="${1:-/Volumes/NK-Working/Dummy}"

# Check for existence before proceeding
[ -d "$SRC" ] || { echo "❌ Source media missing: $SRC"; exit 1; }

echo "📂 Source Path: $SRC"

# Determine Sync Paths
# Standardize path to remove trailing slashes for regex check
SRC="${SRC%/}"

# Logic to preserve 'vcm-s' structure
# If input is '.../media/vcm-s', we want to sync from '.../media'.
# This ensures 'vcm-s' folder itself is copied to '/sdcard/media/vcm-s'.
if [[ "$SRC" == *"vcm-s" ]]; then
    SYNC_SRC="$(dirname "$SRC")"
    SYNC_DEST="/sdcard/media"
    echo "ℹ️  Source ends in 'vcm-s'. Stepping up to parent: $SYNC_SRC"
    echo "    (This ensures vcm-s folder is preserved on tablet)"

elif [ -d "$SRC/media" ]; then
    SYNC_SRC="$SRC/media"
    SYNC_DEST="/sdcard/media"
    echo "ℹ️  Found 'media' subfolder. Syncing subfolder content to /sdcard/media"
else
    SYNC_SRC="$SRC"
    SYNC_DEST="/sdcard/media"
    echo "ℹ️  Syncing content to /sdcard/media"
fi

# ---------------------------------------------------
# SYNC LOGIC: Conditional Mirroring
# STRATEGY: Enter source dir and sync "." to avoid path nesting issues.
# ---------------------------------------------------

# Check if /sdcard/media exists on the tablet
if adb shell "[ -d '/sdcard/media' ]"; then
    echo "ℹ️  Found existing '/sdcard/media'. Performing Update (Mirror)..."
    
    # CASE B: Existing Tablet -> MIRROR
    # Sync CONTENTS of SYNC_SRC to /sdcard/media
    (
        cd "$SYNC_SRC"
        echo "📂 Changing dir to source: $(pwd)"
        adb-sync --delete . "/sdcard/media"
    )

else
    echo "ℹ️  '/sdcard/media' not found. Performing Fresh Copy..."
    
    # CASE A: Fresh Tablet -> COPY ONLY
    # Create dest first, then sync contents
    adb shell mkdir -p "/sdcard/media"
    (
        cd "$SYNC_SRC"
        echo "📂 Changing dir to source: $(pwd)"
        adb-sync . "/sdcard/media"
    )
fi

echo "=============================="
echo "Clone completed: $(date)"
echo "Log: $LOG_FILE"
echo "=============================="
