import React from "react";
import {
  render,
  fireEvent,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import FetchUser from "../FetchUser";

// Note: these tests are to confirm Spectate is working.
// You don't need to write them in your apps!

test("Can show username", async () => {
  const warnSpy = jest.spyOn(console, "warn");

  mockFetchOnce(true, { name: "Spectate" });

  render(<FetchUser />);

  const fetchButton = screen.getByText("Fetch");

  // No username
  expect(screen.queryByText("Username: Spectate")).toBe(null);

  fireEvent.click(fetchButton);

  // Loading
  await screen.findByText("Loading");

  // Finished loading
  await waitForElementToBeRemoved(() => screen.queryByText("Loading"));

  // Username
  expect(screen.queryByText("Username: Spectate")).not.toBe(null);

  expect(warnSpy).not.toHaveBeenCalled();
});

test("Shows error if fetch failed", async () => {
  const warnSpy = jest.spyOn(console, "warn");

  mockFetchOnce(false, {});

  render(<FetchUser />);

  const fetchButton = screen.getByText("Fetch");

  // No error message
  expect(screen.queryByText("Couldn't get user")).toBe(null);

  fireEvent.click(fetchButton);

  // Loading
  await screen.findByText("Loading");

  // Finished loading
  await waitForElementToBeRemoved(() => screen.queryByText("Loading"));

  // Error message
  expect(screen.queryByText("Couldn't get user")).not.toBe(null);
  // No username
  expect(screen.queryByText("Username: Spectate")).toBe(null);

  expect(warnSpy).not.toHaveBeenCalled();
});

function mockFetchOnce<T extends {}>(ok: boolean, json: T) {
  window.fetch = jest.fn().mockImplementationOnce(() => {
    return new Promise((res) => {
      setTimeout(
        () =>
          res({
            ok,
            json: async () => json,
          }),
        1
      );
    });
  });
}
