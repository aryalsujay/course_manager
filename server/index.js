const express = require('express');
const cors = require('cors');
const { copyRecursive, scanDirectory } = require('./lib/copier');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

const PORT = 3001;

// Configuration
const CANDIDATE_PATHS = [
    '/Volumes/NK-Working/Reg-Updates/deshna',
    '/Volumes/Nainish_ITNew/NK-Working-BU/Reg-Updates/deshna'
];
const MOCK_PATH = path.join(__dirname, '../scripts/test_media/source');

let currentAbortController = null;

// Check which path to use (First existing candidate)
const findSourceRoot = () => {
    for (const p of CANDIDATE_PATHS) {
        if (fs.existsSync(p)) return p;
    }
    return fs.existsSync(CANDIDATE_PATHS[0]) ? CANDIDATE_PATHS[0] : MOCK_PATH;
};

let SOURCE_ROOT = findSourceRoot();
console.log(`Using Source Root: ${SOURCE_ROOT}`);

app.use(cors());
app.use(express.json());

// API: Get Directory Structure
app.get('/api/structure', (req, res) => {
    try {
        const sourcePath = req.query.sourcePath || SOURCE_ROOT;

        console.log(`Reading from: ${sourcePath}`);

        if (!fs.existsSync(sourcePath)) {
            return res.status(404).json({ error: "Source directory not found" });
        }

        const structure = {};
        const entires = fs.readdirSync(sourcePath, { withFileTypes: true });

        entires.forEach(entry => {
            if (entry.isDirectory()) {
                const courseType = entry.name;
                const coursePath = path.join(sourcePath, courseType);

                const courseData = {
                    instructions: [],
                    discourses: []
                };

                // Read contents of course type
                const items = fs.readdirSync(coursePath, { withFileTypes: true });

                items.forEach(item => {
                    if (item.isDirectory()) {
                        if (item.name === 'Discourses') {
                            // Read languages inside Discourses
                            const discoursePath = path.join(coursePath, 'Discourses');
                            const discourseItems = fs.readdirSync(discoursePath, { withFileTypes: true });
                            courseData.discourses = discourseItems
                                .filter(d => d.isDirectory() && !d.name.startsWith('.'))
                                .map(d => d.name);
                        } else if (!item.name.startsWith('.')) {
                            // It's an instruction set
                            courseData.instructions.push(item.name);
                        }
                    }
                });

                structure[courseType] = courseData;
            }
        });

        res.json({ structure, sourcePath });
    } catch (error) {
        console.error("Error reading structure:", error);
        res.status(500).json({ error: error.message });
    }
});

// API: Start Copy Process
app.post('/api/copy', (req, res) => {
    let { selections, destination, sourcePath, syncMode } = req.body;
    // selections: { [CourseType]: { instructions: [], discourses: [] } }

    // Default mode
    if (!syncMode) syncMode = 'mirror';

    const rootSource = sourcePath || SOURCE_ROOT;

    if (!destination) {
        return res.status(400).json({ error: "Destination path is required" });
    }

    // Enforce /media/vcm-s structure
    if (!destination.endsWith('media/vcm-s')) {
        destination = path.join(destination, 'media/vcm-s');
    }

    if (!fs.existsSync(destination)) {
        try {
            fs.mkdirSync(destination, { recursive: true });
        } catch (e) {
            return res.status(400).json({ error: "Could not create destination directory" });
        }
    }

    if (currentAbortController) {
        currentAbortController.abort();
    }
    currentAbortController = new AbortController();

    res.json({ message: "Copy started", status: "started" });

    processCopy(selections, destination, rootSource, currentAbortController.signal, syncMode);
});

const { startSync, stopSync } = require('./lib/tablet-sync');

// ... (previous endpoints) ...

app.post('/api/stop', (req, res) => {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
        res.json({ message: "Process stopped" });
    } else {
        res.status(400).json({ error: "No process running" });
    }
});

// --- TABLET SYNC API ---

app.post('/api/tablet-sync/start', (req, res) => {
    const { sourcePath } = req.body;

    // Default if not provided
    const textSource = sourcePath || '/Volumes/NK-Working/Dummy/media';

    const socket = io;

    startSync(textSource, {
        onLog: (msg) => socket.emit('tablet-log', msg),
        onExit: (code) => socket.emit('tablet-complete', code)
    });

    res.json({ message: "Tablet sync started" });
});

app.post('/api/tablet-sync/stop', (req, res) => {
    if (stopSync()) {
        res.json({ message: "Sync stopped" });
        io.emit('tablet-log', '🛑 Sync stopped by user.');
        io.emit('tablet-complete', 1); // Treat as error/manual stop
    } else {
        res.status(400).json({ error: "No sync running" });
    }
});

async function processCopy(selections, destination, rootSource, signal, syncMode) {
    const socket = io;
    const tasks = [];

    // [NEW] Always copy Pagoda Image if it exists
    tasks.push({
        type: 'single_file',
        course: 'ROOT',
        item: 'Pagoda Image',
        sourceRelPath: 'Pagoda Dummy.jpg',
        destRelPath: 'pagoda.jpg'
    });

    // const touchedPaths = new Set(); // Removed: Old Mirror Logic

    // Determine scopes for Overwrite/Mirror
    // We only touch the specific course folders selected
    const activeCourseScopes = Object.keys(selections);

    // Flatten tasks
    for (const [courseType, data] of Object.entries(selections)) {
        // Add instructions
        if (data.instructions) {
            for (const lang of data.instructions) {
                tasks.push({
                    type: 'instruction',
                    course: courseType,
                    item: lang,
                    relPath: path.join(courseType, lang)
                });
            }
        }
        // Add discourses
        if (data.discourses) {
            for (const disc of data.discourses) {
                tasks.push({
                    type: 'discourse',
                    course: courseType,
                    item: disc,
                    relPath: path.join(courseType, 'Discourses', disc)
                });
            }
        }

        // [NEW] Handle Flat/Root Copy
        if ((!data.instructions || data.instructions.length === 0) &&
            (!data.discourses || data.discourses.length === 0)) {

            // Special Case: dhamma-servers -> Files Only
            if (courseType === 'dhamma-servers') {
                tasks.push({
                    type: 'root_files',
                    course: courseType,
                    item: 'ROOT_FILES',
                    relPath: courseType
                });
            } else {
                // Default Flat -> Recursive Copy
                tasks.push({
                    type: 'root_copy',
                    course: courseType,
                    item: 'ROOT',
                    relPath: courseType
                });
            }
        } else {
            // [NEW] If structured selections exist, ALSO copy files in the course root
            tasks.push({
                type: 'root_files',
                course: courseType,
                item: 'ROOT_FILES',
                relPath: courseType
            });
        }
    }

    const totalTasks = tasks.length;

    // 1. Scan Phase
    socket.emit('log', 'Scanning files...');
    let totalFiles = 0;
    let totalBytes = 0;

    for (const task of tasks) {
        if (signal?.aborted) break;
        const taskRelPath = task.sourceRelPath || task.relPath;
        const scanPath = path.join(rootSource, taskRelPath);
        const stats = await scanDirectory(scanPath, { signal });
        totalFiles += stats.files;
        totalBytes += stats.bytes;
    }

    if (signal?.aborted) {
        socket.emit('log', '🛑 Process stopped by user.');
        socket.emit('stopped');
        return;
    }

    socket.emit('log', `Starting copy of ${totalFiles} files (${(totalBytes / (1024 * 1024)).toFixed(1)} MB) to ${destination}...`);

    // 2. Copy Phase
    let copiedFiles = 0;
    let copiedBytes = 0;
    let lastEmit = 0;

    const emitProgress = (currentFile, force = false) => {
        const now = Date.now();
        if (force || now - lastEmit > 200 || copiedFiles === totalFiles) {
            socket.emit('progress', {
                files: { current: copiedFiles, total: totalFiles },
                bytes: { current: copiedBytes, total: totalBytes },
                currentFile
            });
            lastEmit = now;
        }
    };

    // Initial emit
    emitProgress('', true);

    // [MODE: MIRROR] Pre-Copy Cleanup
    if (syncMode === 'mirror') {
        socket.emit('log', '🧹 MIRROR MODE: Analyzing destination for cleanup...');
        let deletedCount = 0;

        // Recursive Clean Function
        const cleanDestination = (currentDestPath, currentSourcePath) => {
            console.log(`[CLEAN] Visiting: ${currentDestPath}`);
            if (!fs.existsSync(currentDestPath)) {
                console.log(`[CLEAN] Path does not exist: ${currentDestPath}`);
                return;
            }

            const destEntries = fs.readdirSync(currentDestPath, { withFileTypes: true });

            for (const entry of destEntries) {
                const destChildPath = path.join(currentDestPath, entry.name);
                const sourceChildPath = path.join(currentSourcePath, entry.name);

                // 1. Check if exists in source
                if (!fs.existsSync(sourceChildPath)) {
                    // Not in source -> Delete
                    if (entry.isDirectory()) {
                        fs.rmSync(destChildPath, { recursive: true, force: true });
                        socket.emit('log', `🗑️ Removed extra folder: ${entry.name}`);
                    } else {
                        // Ignore system files
                        if (!['.DS_Store', 'Thumbs.db'].includes(entry.name)) {
                            fs.unlinkSync(destChildPath);
                            socket.emit('log', `🗑️ Removed extra file: ${entry.name}`);
                            deletedCount++;
                        }
                    }
                    continue; // Next entry
                }

                // 2. If valid source exists, recurse if directory
                if (entry.isDirectory()) {
                    cleanDestination(destChildPath, sourceChildPath);
                }
            }
        };

        // Execution: Top-Level Cleanup for Unselected Courses
        if (fs.existsSync(destination)) {
            const rootEntries = fs.readdirSync(destination, { withFileTypes: true });
            for (const entry of rootEntries) {
                // Ignore system files
                if (['.DS_Store', 'Thumbs.db'].includes(entry.name)) continue;

                if (entry.isDirectory()) {
                    // If course folder is NOT in selection, delete it
                    if (!activeCourseScopes.includes(entry.name)) {
                        const entryPath = path.join(destination, entry.name);
                        fs.rmSync(entryPath, { recursive: true, force: true });
                        socket.emit('log', `🗑️ Removed unselected Course Type: ${entry.name}`);
                    }
                }
            }
        }

        // Execution: Only clean internals of SELECTED courses
        for (const course of activeCourseScopes) {
            const courseDestPath = path.join(destination, course);
            const courseSourcePath = path.join(rootSource, course);

            // We need to be careful. The user said "whatever I select... only that data should go there".
            // But my selections object only has specific instructions/discourses. 
            // Does "cleanDestination" need to respect selections? YES.

            // Enhanced Logic:
            // 1. If folder is in Dest but NOT in Source -> Delete (Handled above).
            // 2. If folder is in Dest AND Source, but NOT in Selections -> Delete.

            if (fs.existsSync(courseDestPath)) {
                // Scan Course Root Level
                const courseEntries = fs.readdirSync(courseDestPath, { withFileTypes: true });
                const courseSelections = selections[course]; // { instructions: [], discourses: [] }

                for (const entry of courseEntries) {
                    const entryPath = path.join(courseDestPath, entry.name);

                    // System files
                    if (['.DS_Store', 'Thumbs.db'].includes(entry.name)) continue;

                    if (entry.isDirectory()) {
                        if (entry.name === 'Discourses') {
                            // Handle Discourses
                            if (fs.existsSync(entryPath)) {
                                const discEntries = fs.readdirSync(entryPath, { withFileTypes: true });
                                for (const disc of discEntries) {
                                    const discPath = path.join(entryPath, disc.name);
                                    if (disc.isDirectory()) {
                                        // Check validity: In Source? In Selection?
                                        const sourceDiscPath = path.join(rootSource, course, 'Discourses', disc.name);
                                        const inSource = fs.existsSync(sourceDiscPath);

                                        // If flat mode, allow all discourses
                                        const isFlatMode = courseSelections.instructions.length === 0 && courseSelections.discourses.length === 0;
                                        const isSelected = isFlatMode ? true : courseSelections.discourses.includes(disc.name);

                                        if (!inSource || !isSelected) {
                                            fs.rmSync(discPath, { recursive: true, force: true });
                                            socket.emit('log', `🗑️ Pruned Discourse: ${disc.name}`);
                                        } else {
                                            // Deep clean inside selected discourse
                                            cleanDestination(discPath, sourceDiscPath);
                                        }
                                    }
                                }
                            }
                        } else {
                            // Handle Instructions (Folders at root of Course)
                            const sourceInstPath = path.join(rootSource, course, entry.name);
                            const inSource = fs.existsSync(sourceInstPath);

                            // If flat mode (no selections), treat everything as selected (Mirror full folder)
                            const isFlatMode = courseSelections.instructions.length === 0 && courseSelections.discourses.length === 0;
                            const isSelected = isFlatMode ? true : courseSelections.instructions.includes(entry.name);

                            if (!inSource || !isSelected) {
                                fs.rmSync(entryPath, { recursive: true, force: true });
                                socket.emit('log', `🗑️ Pruned Instruction: ${entry.name}`);
                            } else {
                                // Deep clean inside selected instruction
                                cleanDestination(entryPath, sourceInstPath);
                            }
                        }
                    } else {
                        // File at Course Root?
                        // Always strict mirror against source
                        const sourceFilePath = path.join(rootSource, course, entry.name);
                        if (!fs.existsSync(sourceFilePath)) {
                            fs.unlinkSync(entryPath);
                        }
                    }
                }
            }
        }
        socket.emit('log', `✅ Pre-Copy Cleanup complete.`);
    }

    // [MODE: OVERWRITE] Delete DESTINATION ROOT before copy
    if (syncMode === 'overwrite') {
        socket.emit('log', '⚠️  OVERWRITE MODE: Wiping destination directory...');
        if (fs.existsSync(destination)) {
            // We can't just rm the root if it's a mount point or something critical, 
            // but the destination is validated to end with /media/vcm-s earlier.
            // Safe approach: Delete all children. 
            // Or simpler: rm recursive and recreate.
            try {
                fs.rmSync(destination, { recursive: true, force: true });
                fs.mkdirSync(destination, { recursive: true });
                socket.emit('log', '✅ Destination wiped successfully.');
            } catch (e) {
                socket.emit('log', `❌ Error wiping destination: ${e.message}`);
                // Stop to prevent mixing data? 
                // Proceeding might be dangerous if wipe failed.
                return;
            }
        } else {
            fs.mkdirSync(destination, { recursive: true });
        }
    }

    for (const [index, task] of tasks.entries()) {
        if (signal?.aborted) {
            socket.emit('stopped');
            break;
        }

        const { course, item, relPath } = task;
        // Handle different path structures
        const sourcePath = task.sourceRelPath ? path.join(rootSource, task.sourceRelPath) : path.join(rootSource, relPath);
        const targetPath = task.destRelPath ? path.join(destination, task.destRelPath) : path.join(destination, relPath);

        // Ensure parent dir exists
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });

        const displayPath = relPath || task.destRelPath || task.item || 'Unknown Item';
        socket.emit('log', `Processing ${displayPath}...`);

        const onLog = (msg) => socket.emit('log', msg);
        const onProgress = (delta) => {
            copiedFiles += delta.files;
            copiedBytes += delta.bytes;
            emitProgress(displayPath);
        };

        /* const trackFile = (filePath) => {
            if (syncMode === 'mirror') {
                socket.emit('log', `Tracking: ${filePath}`);
                console.log(`[MIRROR TRACK] ${filePath}`);
                touchedPaths.add(path.resolve(filePath));
            }
        }; */

        try {
            if (task.type === 'single_file') {
                // Handle single file copy (Pagoda)
                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, targetPath);
                    copiedFiles++; // Count as 1 file
                    // copiedBytes += fs.statSync(sourcePath).size; // Simplify byte counting for single file
                    emitProgress(task.destRelPath);
                } else {
                    socket.emit('log', `⚠️ Skipped: ${task.sourceRelPath} not found.`);
                }
            } else if (task.type === 'root_files') {
                // Copy only FILES in the directory, ignore subdirectories
                if (fs.existsSync(sourcePath)) {
                    const entries = fs.readdirSync(sourcePath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isFile() && !['.DS_Store', 'Thumbs.db'].includes(entry.name)) {
                            const srcFile = path.join(sourcePath, entry.name);
                            const destFile = path.join(targetPath, entry.name);
                            fs.copyFileSync(srcFile, destFile);
                            // emitProgress(path.join(relPath, entry.name)); // Optional: emit for every file
                        }
                    }
                    socket.emit('log', `📄 Copied root files for ${course}`);
                }
            } else {
                // Standard Recursive Copy
                await copyRecursive(sourcePath, targetPath, { onLog, onProgress, signal });
            }
        } catch (err) {
            if (signal?.aborted || err.message === 'Aborted by user') {
                socket.emit('log', '🛑 Process stopped by user.');
                socket.emit('stopped');
                break;
            }
            socket.emit('log', `ERROR copying ${relPath}: ${err.message}`);
        }
    }

    if (!signal?.aborted) {

        /* Removed old post-copy cleanup */
        if (syncMode === 'mirror') {
            socket.emit('log', `✅ Mirror Sync Complete.`);
        }

        emitProgress('', true);
        socket.emit('complete', { message: "All tasks completed!" });
    }
}



server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
