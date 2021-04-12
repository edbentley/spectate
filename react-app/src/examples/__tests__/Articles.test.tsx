import React from "react";
import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import Articles from "../Articles";

// Note: these tests are to confirm Spectate is working.
// You don't need to write them in your apps!

test("Can show articles on page load", async () => {
  const warnSpy = jest.spyOn(console, "warn");

  mockFetchOnce(true, {
    articles: [
      { title: "Mock Title 1" },
      { title: "Mock Title 2" },
      { title: "Mock Title 3" },
    ],
  });

  render(<Articles />);

  // Loading
  await screen.findByText("Loading");

  // Finished loading
  await waitForElementToBeRemoved(() => screen.queryByText("Loading"));

  // Titles
  expect(
    screen.queryByText(
      "Article titles: Mock Title 1, Mock Title 2, Mock Title 3"
    )
  ).not.toBe(null);

  expect(warnSpy).not.toHaveBeenCalled();
});

test("Shows error if fetch failed", async () => {
  const warnSpy = jest.spyOn(console, "warn");

  mockFetchOnce(false, {});

  render(<Articles />);

  // Loading
  await screen.findByText("Loading");

  // Finished loading
  await waitForElementToBeRemoved(() => screen.queryByText("Loading"));

  // Error message
  expect(screen.queryByText("Couldn't get articles")).not.toBe(null);

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
