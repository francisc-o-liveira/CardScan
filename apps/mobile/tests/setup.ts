// jest-expo provides the React Native environment; RNTL v14 ships its own jest matchers.
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);

// Icon fonts are loaded asynchronously from an asset registry that does not exist under Jest.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  return { Ionicons: ({ name }: { name: string }) => React.createElement("Icon", { name }) };
});
