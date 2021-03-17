import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import TodoApp from "../TodoApp";

// Note: these tests are to confirm Spectate is working.
// You don't need to write them in your apps!

test("Can create multiple TODO cards", () => {
  const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => null);
  const warnSpy = jest.spyOn(console, "warn");

  render(<TodoApp />);

  const newCardInput = screen.getByLabelText("New Card") as HTMLInputElement;
  const addButton = screen.getByText("Add");

  fireEvent.change(newCardInput, { target: { value: "Wash the clothes" } });
  fireEvent.click(addButton);

  // Cleared
  expect(newCardInput.value).toBe("");

  // Card added
  expect(screen.queryByText("Wash the clothes")).not.toBe(null);

  // Add two more
  fireEvent.change(newCardInput, { target: { value: "Clean the car" } });
  fireEvent.click(addButton);
  fireEvent.change(newCardInput, { target: { value: "Feed the cat" } });
  fireEvent.click(addButton);

  // Click middle card cross
  const middleRemoveButton = screen.getByText("Clean the car").nextSibling!;

  fireEvent.click(middleRemoveButton);

  // Card removed, other 2 remain
  expect(screen.queryByText("Wash the clothes")).not.toBe(null);
  expect(screen.queryByText("Clean the car")).toBe(null);
  expect(screen.queryByText("Feed the cat")).not.toBe(null);

  expect(consoleSpy).toHaveBeenCalledWith("Removing", "Clean the car");
  expect(warnSpy).not.toHaveBeenCalled();
});

test("Will not create card with empty text", () => {
  const warnSpy = jest.spyOn(console, "warn");

  render(<TodoApp />);

  const addButton = screen.getByText("Add");

  fireEvent.click(addButton);

  // No card added
  expect(screen.queryByText("X")).toBe(null);

  expect(warnSpy).not.toHaveBeenCalled();
});
