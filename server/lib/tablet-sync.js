const { spawn } = require('child_process');
const path = require('path');

let currentProcess = null;

/**
 * Starts the tablet sync process.
 * @param {string} sourcePath - The source directory to sync from.
 * @param {Object} callbacks - Hooks for logs and completion.
 * @param {Function} callbacks.onLog - Called with log lines.
 * @param {Function} callbacks.onExit - Called when process exits.
 */
function startSync(sourcePath, { onLog, onExit }) {
    if (currentProcess) {
        onLog("⚠️ A sync process is already running.");
        return;
    }

    const scriptPath = path.resolve(__dirname, '../../clone-tab/clone.sh');

    // Ensure the script is executable
    // (In a real deployment you might want to chmod it explicitly or assume it is)

    onLog(`🚀 Starting Tablet Sync...`);
    onLog(`📂 Source: ${sourcePath}`);
    onLog(`📜 Script: ${scriptPath}`);

    // Spawn the shell script
    // We pass sourcePath as the first argument
    currentProcess = spawn(scriptPath, [sourcePath]);

    currentProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) onLog(line.trim());
        });
    });

    currentProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) onLog(`ERROR: ${line.trim()}`);
        });
    });

    currentProcess.on('close', (code) => {
        onLog(`🏁 Process exited with code ${code}`);
        currentProcess = null;
        if (onExit) onExit(code);
    });

    currentProcess.on('error', (err) => {
        onLog(`❌ Failed to start process: ${err.message}`);
        currentProcess = null;
        if (onExit) onExit(1);
    });
}

/**
 * Stops the current sync process if running.
 */
function stopSync() {
    if (currentProcess) {
        currentProcess.kill(); // SIGTERM
        currentProcess = null;
        return true;
    }
    return false;
}

module.exports = { startSync, stopSync };
