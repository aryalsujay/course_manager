
const fs = require('fs');
const path = require('path');
const { io } = require("socket.io-client");

const TEST_SOURCE = path.join(__dirname, 'test_media/source');
const TEST_DEST = path.join(__dirname, 'test_media/destination/media/vcm-s');
const SERVER_URL = 'http://localhost:3001';

async function setupTestEnvironment() {
    console.log("🛠️ Setting up test environment...");
    if (fs.existsSync(TEST_SOURCE)) fs.rmSync(TEST_SOURCE, { recursive: true, force: true });
    if (fs.existsSync(TEST_DEST)) fs.rmSync(TEST_DEST, { recursive: true, force: true });

    fs.mkdirSync(TEST_SOURCE, { recursive: true });
    fs.mkdirSync(TEST_DEST, { recursive: true });

    // 1. Pagoda Image
    fs.writeFileSync(path.join(TEST_SOURCE, 'Pagoda Dummy.jpg'), 'fake_image_data');

    // 2. Flat Course (common-general)
    const flatPath = path.join(TEST_SOURCE, 'common-general');
    fs.mkdirSync(flatPath);
    fs.writeFileSync(path.join(flatPath, 'file1.txt'), 'content');
    fs.writeFileSync(path.join(flatPath, 'file2.mp3'), 'content');

    // 3. Structured Course with Root Files (Dhamma Server)
    const structuredPath = path.join(TEST_SOURCE, 'Dhamma Server');
    fs.mkdirSync(structuredPath);
    fs.writeFileSync(path.join(structuredPath, 'index.html'), 'root file content');
    fs.mkdirSync(path.join(structuredPath, 'Hindi'));
    fs.writeFileSync(path.join(structuredPath, 'Hindi', 'audio.mp3'), 'audio');
    fs.mkdirSync(path.join(structuredPath, 'English')); // Unselected
    fs.writeFileSync(path.join(structuredPath, 'English', 'audio.mp3'), 'audio');

    // 4. Nested Structure (dhamma-servers/Bengali) - Reproducing user case
    const nestedCourse = path.join(TEST_SOURCE, 'dhamma-servers');
    fs.mkdirSync(nestedCourse);
    fs.mkdirSync(path.join(nestedCourse, 'Bengali'));
    fs.writeFileSync(path.join(nestedCourse, 'Bengali', '1992-02_OS_Talk.mp3'), 'talk content');

    console.log("✅ Test environment ready.");
}

async function runTest() {
    await setupTestEnvironment();

    const socket = io(SERVER_URL);

    socket.on('connect', () => console.log("Connected to server socket"));
    socket.on('log', (msg) => console.log(`[SERVER LOG]: ${msg}`));
    socket.on('progress', (data) => console.log(`[PROGRESS]: ${data.currentFile}`));
    socket.on('complete', async () => {
        console.log("✅ Copy Process Completed. Verifying files...");
        verifyResults();
        // socket.disconnect(); // Keep open to see logs
        process.exit(0);
    });

    const payload = {
        sourcePath: TEST_SOURCE,
        destination: path.join(__dirname, 'test_media/destination'), // API appends media/vcm-s
        syncMode: 'mirror',
        selections: {
            // Case 1: Flat Selection
            'common-general': { instructions: [], discourses: [] },
            // Case 2: Structured Selection (One lang selected)
            'Dhamma Server': { instructions: ['Hindi'], discourses: [] },
            // Case 3: Nested Selection
            'dhamma-servers': { instructions: ['Bengali'], discourses: [] }
        }
    };

    console.log("🚀 Starting Copy Request...");
    try {
        const response = await fetch(`${SERVER_URL}/api/copy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const json = await response.json();
        console.log("Response:", json);
    } catch (e) {
        console.error("Failed to start copy:", e);
    }
}

function verifyResults() {
    let success = true;

    // 1. Pagoda Image
    if (fs.existsSync(path.join(TEST_DEST, 'pagoda.jpg'))) {
        console.log("✅ Pagoda Image copied and renamed.");
    } else {
        console.error("❌ Pagoda Image MISSING or invalid name.");
        success = false;
    }

    // 2. Flat Course
    if (fs.existsSync(path.join(TEST_DEST, 'common-general/file1.txt'))) {
        console.log("✅ Flat Course file copied.");
    } else {
        console.error("❌ Flat Course file MISSING.");
        success = false;
    }

    // 3. Structured Course - Selected Subfolder
    if (fs.existsSync(path.join(TEST_DEST, 'Dhamma Server/Hindi/audio.mp3'))) {
        console.log("✅ Structured Course subfolder copied.");
    } else {
        console.error("❌ Structured Course subfolder MISSING.");
        success = false;
    }

    // 4. Structured Course - Root File
    if (fs.existsSync(path.join(TEST_DEST, 'Dhamma Server/index.html'))) {
        console.log("✅ Structured Course ROOT FILE copied.");
    } else {
        console.error("❌ Structured Course ROOT FILE MISSING.");
        success = false;
    }

    // 5. Exclusions
    if (!fs.existsSync(path.join(TEST_DEST, 'Dhamma Server/English'))) {
        console.log("✅ Unselected subfolder correctly ignored.");
    } else {
        console.error("❌ Unselected subfolder WAS COPIED (Should be ignored).");
        success = false;
    }

    // 6. Nested Structure
    if (fs.existsSync(path.join(TEST_DEST, 'dhamma-servers/Bengali/1992-02_OS_Talk.mp3'))) {
        console.log("✅ Nested Structure copied.");
    } else {
        console.error("❌ Nested Structure MISSING.");
        success = false;
    }

    if (success) console.log("🎉 ALL TESTS PASSED!");
    else console.log("💥 SOME TESTS FAILED.");
}

runTest();
