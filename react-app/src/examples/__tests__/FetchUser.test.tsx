import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import FetchUser from "../FetchUser";

// Note: these tests are to confirm Spectate is working.
// You don't need to write them in your apps!

afterEach(() => {
  jest.spyOn(Math, "random").mockRestore();
});

test("Can show user ID", () => {
  const warnSpy = jest.spyOn(console, "warn");
  jest.spyOn(Math, "random").mockReturnValue(0.6);

  render(<FetchUser />);

  const fetchButton = screen.getByText("Fetch");

  // No user id
  expect(screen.queryByText("User ID: 9a31495d")).toBe(null);

  fireEvent.click(fetchButton);

  // User id
  expect(screen.queryByText("User ID: 9a31495d")).not.toBe(null);

  expect(warnSpy).not.toHaveBeenCalled();
});

test("Shows error if no user ID", () => {
  const warnSpy = jest.spyOn(console, "warn");
  jest.spyOn(Math, "random").mockReturnValue(0.1);

  render(<FetchUser />);

  const fetchButton = screen.getByText("Fetch");

  // No error message
  expect(screen.queryByText("Couldn't get user")).toBe(null);

  fireEvent.click(fetchButton);

  // Error message
  expect(screen.queryByText("Couldn't get user")).not.toBe(null);
  // No user id
  expect(screen.queryByText("User ID: 9a31495d")).toBe(null);

  expect(warnSpy).not.toHaveBeenCalled();
});
