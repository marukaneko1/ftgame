module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.spec.json"
    }
  }
};

