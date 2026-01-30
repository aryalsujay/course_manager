const fs = require('fs');
const readline = require('readline');

async function analyzeTree() {
    const fileStream = fs.createReadStream('/Users/sujay/antigravity/course_manager/tree.txt');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let currentCourse = null;
    let insideDiscourses = false;

    const instructions = new Set();
    const discourses = new Set();

    // Anomalies
    const capitalizedInstructions = [];
    const lowercaseDiscourses = [];

    // Regex to determine depth and name
    // tree output: 
    // ├── 10-day
    // │   ├── Discourses
    // │   │   ├── Afrikaans

    // We need to track indent level strictly.
    // Level 0: /Volumes/...
    // Level 1: ├── 10-day (Course)
    // Level 2: │   ├── Discourses OR │   ├── eng (Instruction)
    // Level 3: │   │   ├── Afrikaans (Discourse)

    for await (const line of rl) {
        // Remove special tree characters to count depth roughly or use strict regex
        // Typically tree uses 4 spaces per level or │   

        // Simpler approach: check if line contains "Discourses"
        if (line.includes('Discourses')) {
            insideDiscourses = true;
            continue;
        }

        // Detect Course (Level 1)
        // Usually starts with ├── or └── at the beginning (after root)
        // Root line has no prefix usually in "tree" but here it does?
        // Let's assume Course level is the top-most indented blocks.

        const cleanName = line.replace(/[│├└─\s]/g, '');
        if (!cleanName) continue;

        // Determine type based on where we are. 
        // This is hard to parse perfectly from just iteration without stack.
        // Let's rely on naming convention pattern matching which is what the User asked about.

        // "Instruction" usually: eng, eng-fra (lowercase, hyphens)
        // "Discourse" usually: English, French (Capitalized)

        // If we see something in unique lists:

        // Heuristic: 
        // If it starts with Capital and is NOT "Discourses" -> Likely Discourse
        // If it starts with lowercase -> Likely Instruction

        const firstChar = cleanName.charAt(0);

        if (cleanName === 'Discourses') continue;
        if (cleanName.startsWith('/')) continue; // Root
        if (cleanName.match(/^[0-9]+.*day/)) continue; // Course name like 10-day

        if (firstChar === firstChar.toUpperCase() && firstChar.match(/[A-Z]/)) {
            // Capitalized
            discourses.add(cleanName);
        } else if (firstChar === firstChar.toLowerCase() && firstChar.match(/[a-z]/)) {
            // Lowercase
            instructions.add(cleanName);
        }
    }

    // Now cross reference
    console.log("--- Analysis Report ---");
    console.log(`Total Unique Instructions found (Lowercase): ${instructions.size}`);
    console.log(`Total Unique Discourses found (Capitalized): ${discourses.size}`);

    // Check overlaps
    const intersection = [...instructions].filter(x => discourses.has(x));
    if (intersection.length > 0) {
        console.log("WARNING: Items found in bot lists:", intersection);
    } else {
        console.log("No overlap between Lowercase instructions and Capitalized Discourses.");
    }

    // Checking specific question: "Disc folder copied to instr?"
    // If a discourse name (Capitalized) appears inside instruction list?
    // We separated by case, so if "English" appeared in instruction, it would have been flagged as Discourse by my heuristic above.

    // Let's check if my server logic would treat it differently.
    // Server logic: IF parent is 'Discourses' -> Discourse. ELSE -> Instruction.

    console.log("\nSample Instructions:", [...instructions].slice(0, 5));
    console.log("Sample Discourses:", [...discourses].slice(0, 5));
}

analyzeTree();
