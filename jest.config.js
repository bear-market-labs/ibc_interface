module.exports = {
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  transform: {
    "^.+\\.(ts|tsx|jsx|js)$": "ts-jest",
  },
  coveragePathIgnorePatterns: [
    "/node_modules/"
  ],
  moduleNameMapper: {
    "\\.(css|less)$": "identity-obj-proxy",
  },
  transformIgnorePatterns: ['/node_modules/(?!@web3-onboard|nanoid)'],
  preset: 'ts-jest',
  testEnvironment: "jsdom"
};