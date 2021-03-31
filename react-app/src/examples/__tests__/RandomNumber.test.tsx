import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import RandomNumber from "../RandomNumber";

// Note: these tests are to confirm Spectate is working.
// You don't need to write them in your apps!

afterEach(() => {
  jest.spyOn(Math, "random").mockRestore();
});

test("Can generate random numbers", async () => {
  const warnSpy = jest.spyOn(console, "warn");

  jest.spyOn(Math, "random").mockReturnValue(0.1);

  render(<RandomNumber />);

  const generateButton = screen.getByText("Generate");

  // Random number generated on load
  await screen.findByText("1");

  jest.spyOn(Math, "random").mockReturnValue(0.2);

  fireEvent.click(generateButton);

  // Random number generated on click
  await screen.findByText("2");

  expect(warnSpy).not.toHaveBeenCalled();
});
