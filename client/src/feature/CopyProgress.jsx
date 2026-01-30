import React, { useRef, useEffect, useState } from 'react';
import { Terminal } from 'lucide-react';
import { cn } from '../lib/utils';

export default function CopyProgress({ status, progress, logs, startTime }) {
    const logEndRef = useRef(null);
    const [stats, setStats] = useState({ rate: 0, eta: null });
    const [height, setHeight] = useState(192); // Default 12rem (h-48)
    const [isDragging, setIsDragging] = useState(false);

    // Auto-scroll
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Handle Resize
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            const newHeight = window.innerHeight - e.clientY;
            if (newHeight > 100 && newHeight < 600) {
                setHeight(newHeight);
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = 'default';
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'row-resize';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'default';
        };
    }, [isDragging]);

    // Calculate Stats
    useEffect(() => {
        // Reset if not copying
        if (status !== 'copying' || !startTime) {
            setStats({ rate: 0, eta: null });
            return;
        }

        const elapsedSeconds = (Date.now() - startTime) / 1000;

        // Safety: If very start, show 0
        if (elapsedSeconds < 0.5) {
            setStats({ rate: 0, eta: null });
            return;
        }

        const currentBytes = progress.bytes?.current || 0;
        const totalBytes = progress.bytes?.total || 0;

        const rate = currentBytes / elapsedSeconds;
        const remainingBytes = totalBytes - currentBytes;

        // Avoid division by zero
        const etaSeconds = rate > 100 ? remainingBytes / rate : 0; // Only calc ETA if speed > 100 bytes/s

        setStats({
            rate: rate,
            eta: etaSeconds
        });
    }, [progress, status, startTime]);

    const formatTime = (seconds) => {
        if (seconds === null || seconds === undefined || seconds === Infinity || isNaN(seconds)) return '--';
        if (seconds === 0) return 'Calculating...';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}m ${s}s`;
    };

    const formatSize = (bytes) => {
        if (!bytes || isNaN(bytes)) return '0.0 MB';
        // Show KB if small
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    // Helper for safe access
    const pFiles = progress.files || { current: 0, total: 0 };
    const pBytes = progress.bytes || { current: 0, total: 0 };
    const percent = pBytes.total > 0 ? Math.round((pBytes.current / pBytes.total) * 100) : 0;

    return (
        <div
            className="border-t border-dark-700 bg-dark-950 flex flex-col relative z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-[height] duration-0 ease-linear"
            style={{ height: `${height}px` }}
        >
            {/* Drag Handle */}
            <div
                className="absolute top-0 left-0 right-0 h-1.5 cursor-row-resize hover:bg-primary-500/50 transition-colors z-40 group flex justify-center items-center"
                onMouseDown={() => setIsDragging(true)}
            >
                <div className="w-16 h-0.5 bg-dark-600 group-hover:bg-primary-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="p-3 flex flex-col gap-2 h-full">
                <div className="flex justify-between items-end mb-1 flex-shrink-0">
                    <h3 className="text-xs font-semibold flex items-center gap-2 text-gray-400 uppercase tracking-wider">
                        <Terminal className="w-3.5 h-3.5" />
                        System Log
                    </h3>

                    {/* Stats Block - Ensure this is ALWAYS rendered when copying */}
                    {status === 'copying' ? (
                        <div className="flex items-center gap-4 text-[11px] font-mono text-primary-400 bg-dark-900/50 px-2 py-0.5 rounded border border-dark-800">
                            <span className="whitespace-nowrap">
                                <span className="text-gray-500">Files:</span> {pFiles.current} / {pFiles.total}
                            </span>
                            <span className="text-dark-600">|</span>
                            <span className="whitespace-nowrap">
                                <span className="text-gray-500">Speed:</span> {formatSize(stats.rate)}/s
                            </span>
                            <span className="text-dark-600">|</span>
                            <span className="whitespace-nowrap font-bold text-white">
                                <span className="text-gray-500 font-normal">ETA:</span> {formatTime(stats.eta)}
                            </span>
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500 font-mono">
                            {status === 'completed' ? 'Done' : 'Idle'}
                        </div>
                    )}

                    {status === 'copying' && (
                        <div className="text-xs text-gray-500 font-mono">
                            {percent}%
                        </div>
                    )}
                </div>

                {status === 'copying' && (
                    <div className="w-full bg-dark-800 rounded-full h-1 overflow-hidden flex-shrink-0">
                        <div
                            className="bg-primary-600 h-full transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed text-gray-400 bg-black/40 p-2 rounded border border-dark-800/50 mt-1">
                    {logs.length === 0 ? (
                        <span className="text-dark-600 italic">Waiting to sync...</span>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="whitespace-pre-wrap font-mono break-all">
                                {log.startsWith('ERROR') ? (
                                    <span className="text-red-400">{log}</span>
                                ) : log.startsWith('✅') ? (
                                    <span className="text-green-400 font-bold">{log}</span>
                                ) : log.startsWith('🛑') ? (
                                    <span className="text-yellow-400 font-bold">{log}</span>
                                ) : (
                                    <span>{log}</span>
                                )}
                            </div>
                        ))
                    )}
                    <div ref={logEndRef} />
                </div>
            </div>
        </div>
    );
}
