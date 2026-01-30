# VCM Media Database Automation

This project automates the generation of the `data2-<centre>.db` SQLite database for the VCM Android application.

## Prerequisites

*   macOS or Linux
*   `bash` (version 3.2+)
*   `gen-updates-v2` binary must be in your `PATH` (or aliased).

## Directory Structure

```text
.
├── scripts/
│   └── gen_all_updates.sh   # Main automation script
├── db/                      # (Optional) Place to store generated DBs
└── README.md
```

## Usage

### 1. Basic Run
To generate the SQL file using the default paths:
```bash
./scripts/gen_all_updates.sh
```
*   Default Media Root: `/Volumes/NK-Working/Dummy/Sarovar/media`
*   Default Output: `/tmp/a.sql`

### 2. Custom Paths
You can specify the media directory and output file:
```bash
./scripts/gen_all_updates.sh \
    --media-root /path/to/my/media \
    --out /path/to/output.sql
```

### 3. Dry Run (Recommended First Step)
To check which folders will be scanned without generating SQL:
```bash
./scripts/gen_all_updates.sh --dry-run
```

## How it works

1.  Scans the media directory for valid instruction/discourse folders using the pattern:
    *   `*/Discourses/*`
    *   `*/[a-z][a-z][a-z]-*` (e.g., `hin-eng`)
2.  Validates that folders contain actual media files (`.mp3`, `.mp4`, etc.).
3.  Runs `gen-updates-v2 <folder> new` for each valid folder.
4.  Aggregates the output into a single SQL file.

## Integration / Roadmap

*   **Dashboard**: This script is designed to be called by a backend service (Node.js/Python).
*   **Logging**: Currently logs to stdout/stderr.
