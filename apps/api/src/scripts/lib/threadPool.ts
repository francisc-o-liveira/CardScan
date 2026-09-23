/**
 * Image decoding (sharp) and file I/O share libuv's thread pool, which defaults to 4 threads. Indexing
 * decodes thousands of images, so this widens the pool. It must be imported before anything touches the
 * pool: libuv reads the setting once, on first use.
 */
import os from "node:os";

process.env.UV_THREADPOOL_SIZE ??= String(Math.max(8, os.cpus().length));
