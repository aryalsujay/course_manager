#!/usr/bin/env bash
set -e

# Default values
DEFAULT_MEDIA_ROOT="/Volumes/NK-Working/Dummy/Sarovar/media"
DEFAULT_OUT_SQL="/tmp/a.sql"
DRY_RUN=false
MEDIA_ROOT="$DEFAULT_MEDIA_ROOT"
OUT_SQL="$DEFAULT_OUT_SQL"

# Usage help
usage() {
    echo "Usage: $0 [options]"
    echo "Options:"
    echo "  --media-root <path>  Path to the media root directory (default: $DEFAULT_MEDIA_ROOT)"
    echo "  --out <path>         Path to the output SQL file (default: $DEFAULT_OUT_SQL)"
    echo "  --dry-run            Print commands without executing them"
    echo "  --help               Show this help message"
    exit 1
}

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --media-root) MEDIA_ROOT="$2"; shift ;;
        --out) OUT_SQL="$2"; shift ;;
        --dry-run) DRY_RUN=true ;;
        --help) usage ;;
        *) echo "Unknown parameter passed: $1"; usage ;;
    esac
    shift
done

echo "Starting VCM Media DB Generation..."
echo "Media Root: $MEDIA_ROOT"
if [ "$DRY_RUN" = true ]; then
    echo "Mode: DRY RUN (No SQL will be generated)"
else
    echo "Output SQL: $OUT_SQL"
    # clear the output file
    > "$OUT_SQL"
fi
echo

# Check if media root exists
if [ ! -d "$MEDIA_ROOT" ]; then
    echo "Error: Media directory '$MEDIA_ROOT' does not exist."
    exit 1
fi

is_valid_media_dir() {
    local dir="$1"

    # Ignore hidden, temp folders, or metadata folders (like @eaDir on Synology or .AppleDouble)
    case "$(basename "$dir")" in
        .*|@*|_*|System\ Volume\ Information) return 1 ;;
    esac

    # Folder must contain actual media files (case insensitive)
    # Using -print -quit for efficiency - stops at first match
    find "$dir" -maxdepth 1 -type f \( \
        -iname "*.mp3" -o \
        -iname "*.mp4" -o \
        -iname "*.m4a" -o \
        -iname "*.aac" \
    \) -print -quit | grep -q .
}

# Find relevant directories
# - Look for dirs inside a Language structure or Discourses structure
# - Sort unique to avoid duplicates
# Remove trailing slash from MEDIA_ROOT for consistent replacement
MEDIA_ROOT="${MEDIA_ROOT%/}"

echo "Scanning for media folders..."

# The original requirement logic:
# -path "*/Discourses/*" -o -path "*/[a-z][a-z][a-z]-*"
# We keep this logic but Ensure we are scanning from MEDIA_ROOT

find "$MEDIA_ROOT" -type d \( \
        -path "*/Discourses/*" -o \
        -path "*/[a-z][a-z][a-z]-*" \
    \) | sort -u | while IFS= read -r dir; do

    if is_valid_media_dir "$dir"; then
        # Calculate relative path by stripping MEDIA_ROOT and leading slash
        rel_path="${dir#$MEDIA_ROOT/}"
        
        if [ "$DRY_RUN" = true ]; then
            echo "[DRY-RUN] gen-updates-v2 \"$rel_path\" new"
        else
            echo "Processing: $rel_path"
            # We append to the SQL file. 
            # Note: We assume gen-updates-v2 is in PATH. 
            # If it fails, the script will exit due to set -e unless we handle it.
            if ! gen-updates-v2 "$rel_path" new >> "$OUT_SQL"; then
                 echo "Error processing $rel_path. Continuing..." >&2
                 # If we want to be strict, keep set -e exit. 
                 # If we want to skip bad folders, use || true or temporarily set +e
            fi
        fi
    fi
done

echo
echo "Done."
if [ "$DRY_RUN" = false ]; then
    echo "SQL file generated at: $OUT_SQL"
fi
