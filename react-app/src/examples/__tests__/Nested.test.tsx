import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import Nested from "../Nested";

// Note: these tests are to confirm Spectate is working.
// You don't need to write them in your apps!

test("Logs username prop when clicked on", async () => {
  const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => null);
  const warnSpy = jest.spyOn(console, "warn");

  render(<Nested />);

  const usernameInput = screen.getByLabelText("Username");
  const logButton = screen.getByText("Log username");

  fireEvent.change(usernameInput, { target: { value: "hello" } });
  fireEvent.click(logButton);
  await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith("hello"));

  fireEvent.change(usernameInput, { target: { value: "spectate" } });
  fireEvent.click(logButton);
  await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith("hello"));

  expect(warnSpy).not.toHaveBeenCalled();
});
