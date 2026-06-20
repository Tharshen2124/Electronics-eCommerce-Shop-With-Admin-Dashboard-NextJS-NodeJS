module.exports = {
  testEnvironment: "node",
  clearMocks: true,
  reporters: [
    "default",
    [
      "./node_modules/jest-html-reporter",
      {
        pageTitle: "Software Evolution Bug Fix Test Report",
        outputPath: "./test-reports/bug-test-report.html",
        includeFailureMsg: true,
        includeConsoleLog: false,
        sort: "status",
        dateFormat: "yyyy-mm-dd HH:MM:ss",
        executionTimeWarningThreshold: 5,
        boilerplate: null,
        styleOverridePath: null,
        customScriptPath: null,
      },
    ],
  ],
};
