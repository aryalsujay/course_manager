# Course Manager Setup

## Prerequisities
- Node.js (v18 or higher recommended)
- npm

## Installation

1.  **Clone the repository** to your local machine.

2.  **Install Root & Server Dependencies**:
    ```bash
    npm install
    ```

3.  **Install Client Dependencies**:
    ```bash
    cd client
    npm install
    cd ..
    ```

## Running the Application

To run both the server and client concurrently (Development Mode):

```bash
npm run dev
```

- The Server will start on `http://localhost:3001`
- The Client will likely start on `http://localhost:5173` (Vite default)

## Configuration

- **Source Paths**: The server looks for source files in specific paths defined in `server/index.js` (`CANDIDATE_PATHS`).
    - Defaults: `/Volumes/NK-Working/Reg-Updates/deshna`, etc.
    - If these do not exist, it falls back to a mock path if configured, or you may need to adjust `server/index.js` to point to your actual data source.

- **Destination**: The client allows you to select a destination folder.
    - The server enforces that the destination folder name ends with `media/vcm-s`.
