import React from "react";
import {
  render,
  fireEvent,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import TodoApp from "../TodoApp";

// Note: these tests are to confirm Spectate is working.
// You don't need to write them in your apps!

test("Can create multiple TODO cards", async () => {
  const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => null);
  const warnSpy = jest.spyOn(console, "warn");

  render(<TodoApp />);

  const newCardInput = screen.getByLabelText("New Card") as HTMLInputElement;
  const addButton = screen.getByText("Add");

  fireEvent.change(newCardInput, { target: { value: "Wash the clothes" } });
  fireEvent.click(addButton);

  // Card added
  await screen.findByDisplayValue("Wash the clothes");

  // Cleared
  expect(newCardInput.value).toBe("");

  // Add two more
  fireEvent.change(newCardInput, { target: { value: "Clean the car" } });
  fireEvent.click(addButton);
  await screen.findByDisplayValue("Clean the car");
  fireEvent.change(newCardInput, { target: { value: "Feed the cat" } });
  fireEvent.click(addButton);

  // Click middle card cross
  const middleRemoveButton = screen.getByDisplayValue("Clean the car")
    .nextSibling!;

  fireEvent.click(middleRemoveButton);

  // Card removed, other 2 remain
  await waitForElementToBeRemoved(() =>
    screen.queryByDisplayValue("Clean the car")
  );
  expect(screen.queryByDisplayValue("Wash the clothes")).not.toBe(null);
  expect(screen.queryByDisplayValue("Feed the cat")).not.toBe(null);

  expect(consoleSpy).toHaveBeenCalledWith("Removing", "Clean the car");
  expect(warnSpy).not.toHaveBeenCalled();
});

test("Will not create card with empty text", async () => {
  const warnSpy = jest.spyOn(console, "warn");

  render(<TodoApp />);

  const newCardInput = screen.getByLabelText("New Card");
  const addButton = screen.getByText("Add");

  // Add empty card
  fireEvent.click(addButton);

  // Wait for async to flush
  await new Promise((res) => setTimeout(res, 2));

  // No card added
  expect(screen.queryAllByText("X").length).toBe(0);

  // Try adding a card
  fireEvent.change(newCardInput, { target: { value: "Feed the cat" } });
  fireEvent.click(addButton);
  await screen.findByDisplayValue("Feed the cat");

  // Now add empty card
  fireEvent.click(addButton);

  // Wait for async to flush
  await new Promise((res) => setTimeout(res, 2));

  // Still only 1 card added
  expect(screen.queryAllByText("X").length).toBe(1);

  expect(warnSpy).not.toHaveBeenCalled();
});
