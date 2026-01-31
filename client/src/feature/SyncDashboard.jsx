import React, { useState, useEffect } from 'react';
import { useSyncState } from '../hooks/useSyncState';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { Play, CheckCircle, HardDrive, Check, Search, RefreshCw, AlertCircle, FolderInput, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import CopyProgress from './CopyProgress';

export default function SyncDashboard({ onDestinationChange, initialDestination }) {
    const {
        structure,
        allCourses,
        allInstructions,
        allDiscourses,
        selectedCourses,
        selectedInstructions,
        selectedDiscourses,
        destination,
        setDestination,
        sourcePath,     // New
        setSourcePath,  // New
        syncMode,
        setSyncMode,
        activeSource,
        startTime,
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
        setSelectedInstructions, // Setter for None
        setSelectedDiscourses,   // Setter for None
        startCopy,
        stopCopy
    } = useSyncState(initialDestination);

    const [instSearch, setInstSearch] = useState('');
    const [discSearch, setDiscSearch] = useState('');

    // Sync destination with parent
    useEffect(() => {
        if (onDestinationChange) {
            onDestinationChange(destination);
        }
    }, [destination, onDestinationChange]);

    // Custom Dropdown State
    const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
    const sourcePaths = [
        "/Volumes/NK-Working/Reg-Updates/deshna",
        "/Volumes/Nainish_ITNew/NK-Working-BU/Reg-Updates/deshna"
    ];

    const [isDestDropdownOpen, setIsDestDropdownOpen] = useState(false);
    const destinationPaths = [
        "/Volumes/NK-Working/Dummy/",
        "/Volumes/Nainish_ITNew/temp_SA/Dummy/"
    ];


    // Filter logic moved inline or kept as is
    const filteredInstructions = allInstructions.filter(i => i.toLowerCase().includes(instSearch.toLowerCase()));
    const filteredDiscourses = allDiscourses.filter(d => d.toLowerCase().includes(discSearch.toLowerCase()));

    // Availability Helper
    const getAvailability = (item, type) => {
        if (selectedCourses.size === 0) return { status: 'available', missing: [] };

        const missing = [];
        let found = false;

        for (const course of selectedCourses) {
            const data = structure[course];
            if (!data) {
                missing.push(course);
                continue;
            }
            const list = type === 'instruction' ? data.instructions : data.discourses;
            if (list.includes(item)) {
                found = true;
            } else {
                missing.push(course);
            }
        }

        if (!found) return { status: 'unavailable', missing: [] }; // Missing in ALL
        if (missing.length > 0) return { status: 'partial', missing }; // Missing in SOME
        return { status: 'available', missing: [] }; // Missing in NONE
    }

    // Helper to select/deselect specific columns
    const handleSelectAllInstructions = () => {
        if (selectedInstructions.size === allInstructions.length) setSelectedInstructions(new Set());
        else setSelectedInstructions(new Set(allInstructions));
    };

    const handleSelectNoneInstructions = () => setSelectedInstructions(new Set());

    const handleSelectAllDiscourses = () => {
        if (selectedDiscourses.size === allDiscourses.length) setSelectedDiscourses(new Set());
        else setSelectedDiscourses(new Set(allDiscourses));
    };

    const handleSelectNoneDiscourses = () => setSelectedDiscourses(new Set());

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-dark-900 text-gray-200 font-sans">
            {/* Header */}
            <header className="flex-shrink-0 border-b border-dark-800 bg-dark-900/90 backdrop-blur z-20">
                <div className="max-w-[1600px] mx-auto w-full p-4 pl-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded bg-primary-600 flex items-center justify-center text-white font-bold shadow-lg shadow-primary-900/20">V</span>
                            <h1 className="text-xl font-bold tracking-tight text-white">VCM Sync</h1>
                            <button
                                onClick={refreshData}
                                disabled={loading}
                                className={cn("p-1 rounded-full hover:bg-dark-800 transition-colors ml-2", loading && "animate-spin")}
                                title="Refresh Data"
                            >
                                <RefreshCw className="w-4 h-4 text-gray-400" />
                            </button>
                            {error && <span className="text-red-400 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</span>}
                        </div>
                        {status === 'copying' ? (
                            <Button
                                onClick={stopCopy}
                                variant="destructive"
                                className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20"
                            >
                                Stop Copy
                                <span className="ml-2">⏹</span>
                            </Button>
                        ) : (
                            <Button
                                onClick={startCopy}
                                className="shadow-lg shadow-primary-900/20"
                            >
                                Start Copy
                                <Play className="ml-2 w-4 h-4" />
                            </Button>
                        )}
                    </div>

                    {/* Path Config Bar */}
                    <div className="flex items-center gap-4">
                        {/* Source Input */}
                        <div className="flex-1 flex flex-col gap-1">
                            <div className="relative z-50">
                                <div
                                    className="flex items-center gap-2 bg-dark-800 px-3 py-1.5 rounded-md border border-dark-700 focus-within:border-primary-500 transition-colors cursor-text"
                                    onClick={() => setIsSourceDropdownOpen(true)}
                                >
                                    <FolderInput className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs text-gray-500 font-mono flex-shrink-0">Source:</span>
                                    <input
                                        type="text"
                                        className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-500 font-mono"
                                        placeholder="Default Source Path"
                                        value={sourcePath}
                                        onChange={(e) => setSourcePath(e.target.value)}
                                        onFocus={() => setIsSourceDropdownOpen(true)}
                                        onBlur={() => setTimeout(() => setIsSourceDropdownOpen(false), 200)} // Delay to allow click
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsSourceDropdownOpen(!isSourceDropdownOpen);
                                        }}
                                        className="text-gray-500 hover:text-white"
                                    >
                                        {isSourceDropdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                </div>

                                {/* Dropdown Options */}
                                {isSourceDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-md shadow-xl overflow-hidden z-[100]">
                                        {sourcePaths.map((path) => (
                                            <button
                                                key={path}
                                                className="w-full text-left px-3 py-2 text-xs font-mono text-gray-300 hover:bg-primary-600/20 hover:text-white transition-colors truncate block"
                                                onClick={() => {
                                                    setSourcePath(path);
                                                    setIsSourceDropdownOpen(false);
                                                }}
                                            >
                                                {path}
                                            </button>
                                        ))}
                                        <div className="border-t border-dark-700 px-3 py-1.5 bg-dark-900/50">
                                            <span className="text-[10px] text-gray-500 italic">Type to edit manually...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {activeSource && (
                                <div className="text-[10px] text-gray-500 font-mono px-1 flex items-center gap-1">
                                    <span className="text-primary-500">✔ Active:</span> {activeSource}
                                </div>
                            )}
                        </div>

                        {/* Destination Input */}
                        <div className="flex-1 flex flex-col gap-1">
                            <div className="relative z-40">
                                <div className="flex items-center gap-2 bg-dark-800 px-3 py-1.5 rounded-md border border-dark-700 focus-within:border-primary-500 transition-colors cursor-text"
                                    onClick={() => setIsDestDropdownOpen(true)}
                                >
                                    <HardDrive className="w-4 h-4 text-gray-400" />
                                    <span className="text-xs text-gray-500 font-mono flex-shrink-0">Dest:</span>
                                    <input
                                        type="text"
                                        className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-500 font-mono"
                                        placeholder="/path/to/destination"
                                        value={destination}
                                        onChange={(e) => setDestination(e.target.value)}
                                        onFocus={() => setIsDestDropdownOpen(true)}
                                        onBlur={() => setTimeout(() => setIsDestDropdownOpen(false), 200)}
                                    />
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsDestDropdownOpen(!isDestDropdownOpen);
                                        }}
                                        className="text-gray-500 hover:text-white"
                                    >
                                        {isDestDropdownOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                    </button>
                                </div>

                                {/* Dropdown Options */}
                                {isDestDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-md shadow-xl overflow-hidden z-[100]">
                                        {destinationPaths.map((path) => (
                                            <button
                                                key={path}
                                                className="w-full text-left px-3 py-2 text-xs font-mono text-gray-300 hover:bg-primary-600/20 hover:text-white transition-colors truncate block"
                                                onClick={() => {
                                                    setDestination(path);
                                                    setIsDestDropdownOpen(false);
                                                }}
                                            >
                                                {path}
                                            </button>
                                        ))}
                                        <div className="border-t border-dark-700 px-3 py-1.5 bg-dark-900/50">
                                            <span className="text-[10px] text-gray-500 italic">Type to edit manually...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sync Mode Dropdown */}
                        <div className="flex-1 flex flex-col gap-1 max-w-[200px]">
                            <div className="flex items-center gap-2 bg-dark-800 px-3 py-1.5 rounded-md border border-dark-700 focus-within:border-primary-500 transition-colors">
                                <Settings2 className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-500 font-mono">Mode:</span>
                                <select
                                    value={syncMode}
                                    onChange={(e) => setSyncMode(e.target.value)}
                                    className="bg-transparent border-none outline-none text-xs w-full text-white cursor-pointer"
                                >
                                    <option value="update" className="bg-dark-800 text-gray-300">Update Existing</option>
                                    <option value="mirror" className="bg-dark-800 text-blue-300">Mirror Source (Default)</option>
                                    <option value="overwrite" className="bg-dark-800 text-red-300">Total Overwrite (Re-Copy)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content - 3 Columns */}
            <div className="flex flex-1 overflow-hidden divide-x divide-dark-700">

                {/* col 1: Course Types */}
                <div className="flex-1 flex flex-col min-w-0 bg-dark-900/50">
                    <ColumnHeader
                        title="1. Course Types"
                        count={selectedCourses.size}
                        total={allCourses.length}
                        onSelectAll={selectAllCourses}
                        onSelectNone={clearCourses} // Assuming you exported clearCourses or I'll implement inline if missing
                    />
                    <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
                        {allCourses.map(course => (
                            <div
                                key={course}
                                onClick={() => toggleCourse(course)}
                                className={cn(
                                    "flex items-center justify-between p-3 mb-1 rounded cursor-pointer transition-all select-none border border-transparent",
                                    selectedCourses.has(course)
                                        ? "bg-primary-600/20 border-primary-600/30 text-white"
                                        : "hover:bg-dark-800 text-gray-400"
                                )}
                            >
                                <span className="font-medium truncate">{course}</span>
                                {selectedCourses.has(course) && <CheckCircle className="w-4 h-4 text-primary-500" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* col 2: Instructions */}
                <div className="flex-1 flex flex-col min-w-0 bg-dark-900/30">
                    <ColumnHeader
                        title="2. Instructions"
                        count={selectedInstructions.size}
                        total={allInstructions.length}
                        onSelectAll={handleSelectAllInstructions}
                        onSelectNone={handleSelectNoneInstructions}
                    />
                    <SearchInput value={instSearch} onChange={setInstSearch} placeholder="Search languages..." />
                    <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
                        {filteredInstructions.map(inst => {
                            const { status: avail, missing } = getAvailability(inst, 'instruction');
                            const isSelected = selectedInstructions.has(inst);

                            return (
                                <div
                                    key={inst}
                                    onClick={() => toggleInstruction(inst)}
                                    className={cn(
                                        "flex items-center justify-between p-2 mb-1 rounded cursor-pointer transition-all select-none border border-transparent text-sm",
                                        isSelected
                                            ? "bg-blue-900/20 border-blue-500/30 text-blue-100"
                                            : "hover:bg-dark-800 text-gray-400",
                                        avail === 'unavailable' && "opacity-60"
                                    )}
                                >
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 truncate">
                                            <span className={cn(
                                                "truncate",
                                                avail === 'unavailable' ? "text-red-400" : ""
                                            )}>{inst}</span>
                                            {avail === 'unavailable' && <span className="text-[10px] bg-red-900/40 text-red-400 px-1 rounded border border-red-900/50">N/A</span>}
                                        </div>
                                        {avail === 'partial' && (
                                            <span className="text-[10px] text-yellow-500/80 truncate mt-0.5">
                                                N/A: {missing.join(', ')}
                                            </span>
                                        )}
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* col 3: Discourses */}
                <div className="flex-1 flex flex-col min-w-0 bg-dark-900/50">
                    <ColumnHeader
                        title="3. Discourses"
                        count={selectedDiscourses.size}
                        total={allDiscourses.length}
                        onSelectAll={handleSelectAllDiscourses}
                        onSelectNone={handleSelectNoneDiscourses}
                    />
                    <SearchInput value={discSearch} onChange={setDiscSearch} placeholder="Search discourses..." />
                    <div className="flex-1 overflow-y-auto p-2 scroll-smooth">
                        {filteredDiscourses.map(disc => {
                            const { status: avail, missing } = getAvailability(disc, 'discourse');
                            const isSelected = selectedDiscourses.has(disc);

                            return (
                                <div
                                    key={disc}
                                    onClick={() => toggleDiscourse(disc)}
                                    className={cn(
                                        "flex items-center justify-between p-2 mb-1 rounded cursor-pointer transition-all select-none border border-transparent text-sm",
                                        isSelected
                                            ? "bg-purple-900/20 border-purple-500/30 text-purple-100"
                                            : "hover:bg-dark-800 text-gray-400",
                                        avail === 'unavailable' && "opacity-60"
                                    )}
                                >
                                    <div className="flex flex-col min-w-0">
                                        <div className="flex items-center gap-2 truncate">
                                            <span className={cn(
                                                "truncate",
                                                avail === 'unavailable' ? "text-red-400" : ""
                                            )}>{disc}</span>
                                            {avail === 'unavailable' && <span className="text-[10px] bg-red-900/40 text-red-400 px-1 rounded border border-red-900/50">N/A</span>}
                                        </div>
                                        {avail === 'partial' && (
                                            <span className="text-[10px] text-yellow-500/80 truncate mt-0.5">
                                                N/A: {missing.join(', ')}
                                            </span>
                                        )}
                                    </div>
                                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Sticky Footer Log */}
            <CopyProgress status={status} progress={progress} logs={logs} startTime={startTime} />
        </div>
    );
}

// I need to make sure clearCourses is available or fix the prop usage
// In previous steps I exported it. I will assume it's there.
// If I missed exporting clearCourses in useSyncState, I'll fix it in verification.

const ColumnHeader = ({ title, count, total, onSelectAll, onSelectNone }) => (
    <div className="flex items-center justify-between p-4 border-b border-dark-700 bg-dark-800/50 sticky top-0 z-10 backdrop-blur">
        <h3 className="font-semibold text-white">{title}</h3>
        <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{count}/{total}</span>
            <div className="flex items-center gap-1">
                {onSelectAll && (
                    <button onClick={onSelectAll} className="text-[10px] text-primary-500 hover:text-primary-400 font-medium px-1">
                        ALL
                    </button>
                )}
                {onSelectNone && (
                    <button onClick={onSelectNone} className="text-[10px] text-gray-500 hover:text-gray-300 font-medium px-1">
                        NONE
                    </button>
                )}
            </div>
        </div>
    </div>
);

const SearchInput = ({ value, onChange, placeholder }) => (
    <div className="p-2 border-b border-dark-700 bg-dark-900/50 sticky top-[57px] z-10">
        <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded text-sm py-2 pl-8 pr-8 text-white focus:outline-none focus:border-primary-600 placeholder-gray-600"
            />
            {value && (
                <button
                    onClick={() => onChange('')}
                    className="absolute right-2 top-2.5 text-gray-500 hover:text-white"
                    aria-label="Clear search"
                >
                    ✕
                </button>
            )}
        </div>
    </div>
);
