import { useState, useEffect } from 'react';
import { socket } from '../socket';

export const useSyncState = (initialDestination) => {
    // Data Structure
    const [structure, setStructure] = useState({});

    // Flattened Lists for UI
    const [allCourses, setAllCourses] = useState([]);
    const [allInstructions, setAllInstructions] = useState([]);
    const [allDiscourses, setAllDiscourses] = useState([]);

    // Selections (Global)
    const [selectedCourses, setSelectedCourses] = useState(new Set([
        'common-general',
        'common-lang',
        'group-sittings',
        'dhamma-servers'
    ]));
    const [selectedInstructions, setSelectedInstructions] = useState(new Set());
    const [selectedDiscourses, setSelectedDiscourses] = useState(new Set());
    const [activeSource, setActiveSource] = useState(''); // Confirmed source from backend
    const [startTime, setStartTime] = useState(null); // For ETA

    const [destination, setDestination] = useState(initialDestination || '/Volumes/NK-Working/Dummy/');
    const [sourcePath, setSourcePath] = useState(''); // New: Source Path State (Empty allows backend auto-detect)
    const [syncMode, setSyncMode] = useState('mirror'); // update, overwrite, mirror

    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState('idle'); // idle, copying, completed, error
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Initial Fetch
    useEffect(() => {
        refreshData();

        // Socket Listeners
        socket.on('log', (message) => {
            setLogs(prev => [...prev, message]);
        });

        socket.on('progress', (data) => {
            setProgress(data);
        });

        socket.on('complete', () => {
            setStatus('completed');
            setStartTime(null);
            setLogs(prev => [...prev, '✅ Copy Process Completed!']);
        });

        socket.on('stopped', () => {
            setStatus('idle'); // Revert button state
            setStartTime(null);
            setLogs(prev => [...prev, '🛑 Copy Stopped.']);
        });

        return () => {
            socket.off('log');
            socket.off('progress');
            socket.off('complete');
            socket.off('stopped');
        };
    }, []);

    const refreshData = () => {
        setLoading(true);
        setError(null);

        let url = '/api/structure';
        if (sourcePath) {
            url += `?sourcePath=${encodeURIComponent(sourcePath)}`;
        }

        fetch(url)
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch structure");
                return res.json();
            })
            .then(data => {
                // Backend now returns { structure, sourcePath } or just structure (fallback)
                const struct = data.structure || data;
                setStructure(struct);

                // Update active source if provided
                if (data.sourcePath) {
                    setActiveSource(data.sourcePath);
                    if (!sourcePath) setSourcePath(data.sourcePath);
                }

                // Process Lists
                const courses = Object.keys(struct).sort();
                const instructions = new Set();
                const discourses = new Set();

                Object.values(struct).forEach(c => {
                    c.instructions.forEach(i => instructions.add(i));
                    c.discourses.forEach(d => discourses.add(d));
                });

                setAllCourses(courses);
                setAllInstructions([...instructions].sort());
                setAllDiscourses([...discourses].sort());
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError(err.message);
                setLoading(false);
            });
    };

    // Toggle Helpers
    const toggleSetItem = (set, item) => {
        const newSet = new Set(set);
        if (newSet.has(item)) newSet.delete(item);
        else newSet.add(item);
        return newSet;
    };

    const toggleCourse = (course) => {
        setSelectedCourses(prev => toggleSetItem(prev, course));
    };

    // Language Code Mapping
    const LANGUAGE_CODES = {
        'ENG': 'English',
        'HIN': 'Hindi',
        'ARA': 'Arabic',
        'FRE': 'French',
        'FRA': 'French',
        'SPA': 'Spanish',
        'GER': 'German',
        'DEU': 'German',
        'ITA': 'Italian',
        'RUS': 'Russian',
        'POR': 'Portuguese',
        'CHI': 'Chinese',
        'ZHO': 'Chinese',
        'JAP': 'Japanese',
        'JPN': 'Japanese',
        'KOR': 'Korean',
        'BEN': 'Bengali',
        'BUL': 'Bulgarian',
        'BUR': 'Burmese',
        'CRO': 'Croatian',
        'CZE': 'Czech',
        'DAN': 'Danish',
        'DUT': 'Dutch',
        'NLD': 'Dutch',
        'FIN': 'Finnish',
        'GRE': 'Greek',
        'ELL': 'Greek',
        'HEB': 'Hebrew',
        'HUN': 'Hungarian',
        'IND': 'Indonesian',
        'MAY': 'Malay',
        'MSA': 'Malay',
        'MON': 'Mongolian',
        'NOR': 'Norwegian',
        'PER': 'Persian',
        'FAS': 'Persian',
        'POL': 'Polish',
        'ROM': 'Romanian',
        'RON': 'Romanian',
        'SWE': 'Swedish',
        'TAM': 'Tamil',
        'TEL': 'Telugu',
        'THA': 'Thai',
        'TUR': 'Turkish',
        'UKR': 'Ukrainian',
        'VIE': 'Vietnamese'
    };

    const getMatchingDiscourses = (inst) => {
        // Split by hyphen to handle things like "ENG-ARA"
        const parts = inst.split('-').map(p => p.trim().toUpperCase());

        const targetLanguages = new Set();

        parts.forEach(part => {
            // Check if 3-letter code exists in dictionary
            if (LANGUAGE_CODES[part]) {
                targetLanguages.add(LANGUAGE_CODES[part]);
            } else {
                // Fallback: use the part itself if not a code (e.g., "English")
                // Capitalize first letter for better matching chance
                const formatted = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
                targetLanguages.add(formatted);

                // Also add uppercase version just in case
                targetLanguages.add(part);
            }
        });

        const matchingDiscourses = new Set();
        if (targetLanguages.size > 0) {
            allDiscourses.forEach(disc => {
                const discUpper = disc.toUpperCase();
                // Check if this discourse matches ANY of the target languages
                for (const lang of targetLanguages) {
                    const langUpper = lang.toUpperCase();
                    if (discUpper.includes(langUpper)) {
                        matchingDiscourses.add(disc);
                    }
                }
            });
        }
        return matchingDiscourses;
    };

    const toggleInstruction = (inst) => {
        // 1. Toggle the Instruction
        const isSelecting = !selectedInstructions.has(inst);
        setSelectedInstructions(prev => toggleSetItem(prev, inst));

        // 2. Auto-Map Logic
        const matchingDiscourses = getMatchingDiscourses(inst);

        if (matchingDiscourses.size > 0) {
            setSelectedDiscourses(prev => {
                const newSet = new Set(prev);

                if (isSelecting) {
                    // Add all matching
                    matchingDiscourses.forEach(disc => newSet.add(disc));
                } else {
                    // Smart Deselect: Only remove if no OTHER selected instruction needs it
                    const otherSelectedInstructions = Array.from(selectedInstructions).filter(i => i !== inst);

                    const claimedDiscourses = new Set();
                    otherSelectedInstructions.forEach(otherInst => {
                        const othersMatches = getMatchingDiscourses(otherInst);
                        othersMatches.forEach(d => claimedDiscourses.add(d));
                    });

                    matchingDiscourses.forEach(disc => {
                        if (!claimedDiscourses.has(disc)) {
                            newSet.delete(disc);
                        }
                    });
                }
                return newSet;
            });
        }
    };

    const toggleDiscourse = (disc) => {
        setSelectedDiscourses(prev => toggleSetItem(prev, disc));
    };

    const selectAllCourses = () => {
        if (selectedCourses.size === allCourses.length) setSelectedCourses(new Set());
        else setSelectedCourses(new Set(allCourses));
    };

    // Explicit clear functions
    const clearCourses = () => setSelectedCourses(new Set());
    // (Optional: add clearInstructions / clearDiscourses if needed for UI buttons)

    // Prepare Payload for API (Backend handles path enforcement)
    const getPayload = () => {
        const payload = { selections: {}, destination, sourcePath, syncMode };

        selectedCourses.forEach(course => {
            const courseData = structure[course];
            if (!courseData) return;

            const validInstructions = [];
            const validDiscourses = [];

            // Map global selections to this course
            selectedInstructions.forEach(inst => {
                if (courseData.instructions.includes(inst)) {
                    validInstructions.push(inst);
                }
            });

            selectedDiscourses.forEach(disc => {
                if (courseData.discourses.includes(disc)) {
                    validDiscourses.push(disc);
                }
            });

            if (validInstructions.length > 0 || validDiscourses.length > 0) {
                payload.selections[course] = {
                    instructions: validInstructions,
                    discourses: validDiscourses
                };
            } else {
                // If selected but no specific sub-items, send empty which implies "Default Behavior"
                // Server logic:
                // - dhamma-servers: Files Only
                // - Others: Full Recursive Copy
                payload.selections[course] = {
                    instructions: [],
                    discourses: []
                };
            }
        });
        return payload;
    };

    const startCopy = () => {
        setStartTime(Date.now());
        if (!destination) {
            alert("Please enter a destination path.");
            return;
        }
        if (selectedCourses.size === 0) {
            alert("Please select at least one course.");
            return;
        }

        setLogs([]);
        setStatus('copying');
        setProgress({ current: 0, total: 0 });

        if (syncMode === 'overwrite') {
            const confirm = window.confirm("WARNING: 'Total Overwrite' will DELETE ALL content in the destination folders before copying. Are you sure?");
            if (!confirm) return;
        }

        const payload = getPayload();

        fetch('/api/copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(res => {
                if (!res.ok) throw new Error("Copy failed to start");
                return res.json();
            })
            .catch(err => {
                console.error(err);
                setLogs(prev => [...prev, `❌ Error: ${err.message}`]);
                setStatus('error');
            });
    };

    const stopCopy = () => {
        fetch('/api/stop', { method: 'POST' })
            .then(res => res.json())
            .then(data => {
                setLogs(prev => [...prev, '🛑 Stop requested...']);
            })
            .catch(err => console.error("Failed to stop:", err));
    };

    return {
        structure,
        allCourses,
        allInstructions,
        allDiscourses,
        selectedCourses,
        selectedInstructions,
        selectedDiscourses,
        destination,
        setDestination,
        sourcePath,     // Export sourcePath state
        setSourcePath,  // Export setter
        syncMode,
        setSyncMode,
        logs,
        status,
        progress,
        loading,
        error,
        refreshData,
        toggleCourse,
        toggleInstruction,
        toggleDiscourse,
        selectAllCourses,
        clearCourses,
        setSelectedInstructions, // Need setter for 'None' button
        setSelectedDiscourses,   // Need setter for 'None' button
        startCopy,
        stopCopy
    };
};
