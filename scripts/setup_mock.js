const fs = require('fs');
const path = require('path');

const MOCK_ROOT = path.join(__dirname, 'test_media/source');

// Clean up old mock
if (fs.existsSync(MOCK_ROOT)) {
    fs.rmSync(MOCK_ROOT, { recursive: true, force: true });
}

// Ensure mock root exists
fs.mkdirSync(MOCK_ROOT, { recursive: true });

const structure = {
    '10-day': [
        'Discourses/English',
        'Discourses/French',
        'Discourses/Hindi',
        'eng',
        'eng-fra',
        'hin-eng',
        'hin-eng-tel'
    ],
    '1-day': [
        'eng',
        'eng-fra',
        'hin-ben'
    ],
    '3-day': [
        'Discourses/English',
        'Discourses/Spanish',
        'eng',
        'eng-spa'
    ]
};

Object.entries(structure).forEach(([course, paths]) => {
    const coursePath = path.join(MOCK_ROOT, course);
    fs.mkdirSync(coursePath, { recursive: true });

    paths.forEach(p => {
        const fullPath = path.join(coursePath, p);
        fs.mkdirSync(fullPath, { recursive: true });
        // Create a dummy file in it to ensure it's treated as a folder with content? 
        // Not strictly needed for fs.readdir but good for rsync.
        fs.writeFileSync(path.join(fullPath, 'dummy.mp3'), 'content');
    });
});

console.log("Mock data created at", MOCK_ROOT);
