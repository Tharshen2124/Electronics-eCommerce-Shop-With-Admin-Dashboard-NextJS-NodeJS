module.exports = {
  testEnvironment: "node",
  testRegex: "(/__tests__/.*\\.test\\.js$)",
  clearMocks: true,
  forceExit: true,
  setupFiles: ["./__tests__/setup.js"],
};
