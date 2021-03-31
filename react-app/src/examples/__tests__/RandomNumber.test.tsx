import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import RandomNumber from "../RandomNumber";

// Note: these tests are to confirm Spectate is working.
// You don't need to write them in your apps!

beforeEach(() => {
  jest.spyOn(Math, "random").mockReturnValue(0.123456789);
});

afterEach(() => {
  jest.spyOn(Math, "random").mockRestore();
});

test("Can generate random numbers", async () => {
  const warnSpy = jest.spyOn(console, "warn");

  render(<RandomNumber />);

  const generateButton = screen.getByText("Generate");

  // No number
  expect(screen.queryByText("1")).toBe(null);

  fireEvent.click(generateButton);

  // Random number
  await screen.findByText("1");

  expect(warnSpy).not.toHaveBeenCalled();
});
