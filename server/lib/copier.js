const fs = require('fs');
const path = require('path');

/**
 * Recursively copies a directory or file.
 * @param {string} src - Source path
 * @param {string} dest - Destination path
 * @param {object} options - Options: { onLog: (msg) => void }
 */
/**
 * Recursively scans a directory to count files and total size.
 * @param {string} src - Source path
 * @param {object} options - Options: { signal }
 * @returns {Promise<{files: number, bytes: number}>}
 */
async function scanDirectory(src, options = {}) {
    let files = 0;
    let bytes = 0;

    try {
        if (options.signal?.aborted) return { files, bytes };

        const stats = await fs.promises.stat(src);

        if (stats.isDirectory()) {
            const entries = await fs.promises.readdir(src);
            for (const entry of entries) {
                if (options.signal?.aborted) break;
                // Skip hidden/temp
                if (entry === '.DS_Store' || entry === 'Thumbs.db' || entry.endsWith('.tmp')) continue;

                const childSrc = path.join(src, entry);
                const childStats = await scanDirectory(childSrc, options);
                files += childStats.files;
                bytes += childStats.bytes;
            }
        } else if (stats.isFile()) {
            files = 1;
            bytes = stats.size;
        }
    } catch (err) {
        // Ignore errors during scan (e.g. permission denied) to avoid blocking
        console.warn(`Scan warning for ${src}: ${err.message}`);
    }

    return { files, bytes };
}

/**
 * Recursively copies a directory or file.
 * @param {string} src - Source path
 * @param {string} dest - Destination path
 * @param {object} options - Options: { onLog: (msg) => void, onProgress: (delta) => void, signal: AbortSignal }
 */
async function copyRecursive(src, dest, options = {}) {
    const { onLog, onProgress } = options;

    try {
        if (options.signal?.aborted) throw new Error('Aborted by user');

        const stats = await fs.promises.stat(src);

        if (stats.isDirectory()) {
            // Ensure destination exists
            await fs.promises.mkdir(dest, { recursive: true });

            const entries = await fs.promises.readdir(src);
            for (const entry of entries) {
                if (options.signal?.aborted) throw new Error('Aborted by user');

                // Skip common hidden files
                if (entry === '.DS_Store' || entry === 'Thumbs.db' || entry.endsWith('.tmp')) {
                    continue;
                }

                await copyRecursive(path.join(src, entry), path.join(dest, entry), options);
            }
        } else if (stats.isFile()) {
            let validDest = false;
            let destStats = null;
            try {
                destStats = await fs.promises.stat(dest);
            } catch (err) { }

            // Track touched file for Mirror Mode
            if (options.trackFile) {
                // console.log(`[COPIER TRACK] ${dest}`);
                options.trackFile(dest);
            } else {
                // console.log(`[COPIER] No trackFile option for ${dest}`);
            }

            if (destStats && destStats.isFile()) {
                // Smart skip: if size matches and source is not newer than dest
                if (destStats.size === stats.size && stats.mtimeMs <= destStats.mtimeMs) {
                    validDest = true;
                }
            }

            if (!validDest) {
                if (onLog) onLog(`> ${path.basename(dest)}`);

                // Use Streams for cancelable copy
                await new Promise((resolve, reject) => {
                    const readStream = fs.createReadStream(src);
                    const writeStream = fs.createWriteStream(dest);

                    // Abort handling
                    if (options.signal) {
                        if (options.signal.aborted) {
                            readStream.destroy();
                            writeStream.destroy();
                            return reject(new Error('Aborted by user'));
                        }
                        options.signal.addEventListener('abort', () => {
                            readStream.destroy();
                            writeStream.destroy();
                            reject(new Error('Aborted by user'));
                        }, { once: true });
                    }

                    readStream.on('error', reject);
                    writeStream.on('error', reject);
                    writeStream.on('finish', () => {
                        // Restore timestamps
                        fs.promises.utimes(dest, stats.atime, stats.mtime)
                            .then(resolve)
                            .catch(reject);
                    });

                    readStream.pipe(writeStream);
                });

                if (onProgress) onProgress({ files: 1, bytes: stats.size });
            } else {
                // Computed as processed but 0 bytes transferred
                if (onProgress) onProgress({ files: 1, bytes: 0 });
            }
        }
    } catch (err) {
        // if (onLog) onLog(`ERROR: ${err.message}`); // Parent handles generic errors? No, we should log here.
        // Actually, parent index.js catches one level up error. But recursive errors need propagation.
        throw err;
    }
}

module.exports = { copyRecursive, scanDirectory };
