import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';
import { Button } from '../components/ui/button';
import { Play, Tablet, Terminal, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

export default function TabletSync({ initialSourcePath }) {
    const [sourcePath, setSourcePath] = useState(initialSourcePath || '/Volumes/NK-Working/Dummy');
    const [centerName, setCenterName] = useState('');
    const [createWallpaper, setcreateWallpaper] = useState(true); // Default Yes
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [logs, setLogs] = useState([]);
    const [status, setStatus] = useState('idle'); // idle, running, error, complete
    const logEndRef = useRef(null);

    const sourceOptions = [
        "/Volumes/NK-Working/Dummy",
        "/Volumes/Nainish_ITNew/NK-Working-BU/Dummy"
    ];

    useEffect(() => {
        // Scroll to bottom of logs
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    useEffect(() => {
        const handleLog = (msg) => setLogs(prev => [...prev, msg]);
        const handleComplete = (code) => {
            if (code === 0) {
                setStatus('complete');
                setLogs(prev => [...prev, '✅ Tablet Sync Completed Successfully']);
            } else {
                setStatus('error');
                setLogs(prev => [...prev, `❌ Process exited with code ${code}`]);
            }
        };

        socket.on('tablet-log', handleLog);
        socket.on('tablet-complete', handleComplete);

        return () => {
            socket.off('tablet-log', handleLog);
            socket.off('tablet-complete', handleComplete);
        };
    }, []);

    const startSync = async () => {
        // Validation: If No Wallpaper selected but text exists
        if (!createWallpaper && centerName.trim()) {
            // User Warning as per request
            // "If the user checks on no and also types text... provide a warning"
            const proceed = window.confirm("⚠️ You have entered a Center Name but selected NOT to change the wallpaper.\n\nClick OK to proceed without changing wallpaper (ignoring text).\nClick Cancel to go back and select 'Yes'.");
            if (!proceed) return;
        }

        setLogs([]);
        setStatus('running');
        try {
            const res = await fetch('/api/tablet-sync/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourcePath,
                    centerName: createWallpaper ? centerName : '', // Explicitly clear if skipping
                    skipWallpaper: !createWallpaper
                })
            });
            if (!res.ok) throw new Error("Failed to start sync");
        } catch (err) {
            console.error(err);
            setStatus('error');
            setLogs(prev => [...prev, `❌ Error starting sync: ${err.message}`]);
        }
    };

    // ... (stopSync remains same)

    const stopSync = async () => {
        try {
            await fetch('/api/tablet-sync/stop', { method: 'POST' });
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-dark-900 text-gray-200 font-sans">
            {/* Header */}
            <div className="border-b border-dark-800 bg-dark-900/90 backdrop-blur p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/20">
                        <Tablet className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Tablet Sync</h1>
                        <p className="text-sm text-gray-400">Directly clone media to connected Android tablet</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-end gap-4 mt-2">
                    <div className="flex-1 max-w-xl space-y-2">
                        <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Source Path</label>
                        <div className="relative">
                            <div
                                className="flex items-center gap-2 bg-dark-800 px-4 py-3 rounded-lg border border-dark-700 hover:border-emerald-500/50 focus-within:border-emerald-500 transition-colors cursor-text group"
                                onClick={() => setIsDropdownOpen(true)}
                            >
                                <span className="text-gray-500 font-mono select-none">DATA:</span>
                                <input
                                    type="text"
                                    className="bg-transparent border-none outline-none text-sm w-full text-white placeholder-gray-600 font-mono"
                                    value={sourcePath}
                                    onChange={(e) => setSourcePath(e.target.value)}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                                />
                                <button
                                    className="text-gray-500 hover:text-white transition-colors"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsDropdownOpen(!isDropdownOpen);
                                    }}
                                >
                                    {isDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Dropdown */}
                            {isDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-600 rounded-lg shadow-xl overflow-hidden z-50">
                                    {sourceOptions.map(opt => (
                                        <button
                                            key={opt}
                                            className="w-full text-left px-4 py-3 text-xs font-mono text-gray-300 hover:bg-emerald-600/20 hover:text-white transition-colors border-b border-dark-700/50 last:border-0"
                                            onClick={() => {
                                                setSourcePath(opt);
                                                setIsDropdownOpen(false);
                                            }}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 max-w-sm flex gap-4">
                        {/* Wallpaper Toggle */}
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Change Wallpaper?</label>
                            <div className="flex bg-dark-800 rounded-lg p-1 border border-dark-700 h-[46px]">
                                <button
                                    onClick={() => setcreateWallpaper(true)}
                                    className={cn(
                                        "px-3 text-sm font-medium rounded-md transition-all flex-1",
                                        createWallpaper ? "bg-emerald-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
                                    )}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={() => setcreateWallpaper(false)}
                                    className={cn(
                                        "px-3 text-sm font-medium rounded-md transition-all flex-1",
                                        !createWallpaper ? "bg-dark-600 text-white shadow" : "text-gray-400 hover:text-gray-200"
                                    )}
                                >
                                    No
                                </button>
                            </div>
                        </div>

                        {/* Center Name Input */}
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-mono text-gray-500 uppercase tracking-wider">Center Name</label>
                            <div className={cn(
                                "flex items-center gap-2 bg-dark-800 px-4 py-3 rounded-lg border transition-colors cursor-text group h-[46px]",
                                createWallpaper ? "border-dark-700 hover:border-emerald-500/50 focus-within:border-emerald-500" : "border-dark-800 opacity-50 cursor-not-allowed"
                            )}>
                                <input
                                    type="text"
                                    className={cn(
                                        "bg-transparent border-none outline-none text-sm w-full placeholder-gray-600",
                                        createWallpaper ? "text-white" : "text-gray-500 cursor-not-allowed"
                                    )}
                                    placeholder={createWallpaper ? "e.g. D' Songadh - 4" : "Skipping wallpaper..."}
                                    value={centerName}
                                    onChange={(e) => setCenterName(e.target.value)}
                                    disabled={!createWallpaper}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pb-0.5">
                        {status === 'running' ? (
                            <Button
                                onClick={stopSync}
                                className="h-[46px] px-6 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20 font-medium"
                            >
                                Stop Sync ⏹
                            </Button>
                        ) : (
                            <Button
                                onClick={startSync}
                                className="h-[46px] px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20 font-medium"
                            >
                                Start Sync <Play className="ml-2 w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Terminal Output */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                    <Terminal className="w-4 h-4 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Execution Logs</span>
                </div>

                <div className="flex-1 bg-black/40 rounded-xl border border-dark-700 backdrop-blur-sm p-4 overflow-y-auto font-mono text-sm shadow-inner">
                    {logs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-3">
                            <Terminal className="w-12 h-12 opacity-20" />
                            <p>Ready to sync. Connect tablet and click Start.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {logs.map((log, i) => (
                                <div key={i} className={cn(
                                    "break-words",
                                    log.includes("❌") || log.includes("ERROR") ? "text-red-400" :
                                        log.includes("✅") ? "text-emerald-400" :
                                            "text-gray-300"
                                )}>
                                    <span className="opacity-30 mr-3 select-none">
                                        {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    {log}
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
