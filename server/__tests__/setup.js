// Suppress noisy console output during test runs.
// Error handling assertions still work — this only silences the printed output
// from asyncHandler and handleServerError in errorHandler.js.
const noop = () => {};
global.console.error = noop;
global.console.log = noop;
global.console.warn = noop;
