import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import EmailForm from "../EmailForm";

// Note: these tests are to confirm Spectate is working.
// You don't need to write them in your apps!

test("Can sign up with email and password", () => {
  const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => null);
  const warnSpy = jest.spyOn(console, "warn");

  render(<EmailForm />);

  const emailInput = screen.getByLabelText("Email");
  const passwordInput = screen.getByLabelText("Password");
  const signUpButton = screen.getByText("Sign Up");

  fireEvent.change(emailInput, { target: { value: "hello@test.com" } });

  fireEvent.change(passwordInput, { target: { value: "my_password" } });

  fireEvent.click(signUpButton);

  expect(consoleSpy).toHaveBeenCalledWith("POST", {
    email: "hello@test.com",
    password: "my_password",
  });
  expect(warnSpy).not.toHaveBeenCalled();
});

test("Shows error if empty email", () => {
  const consoleSpy = jest.spyOn(console, "log");
  const warnSpy = jest.spyOn(console, "warn");

  render(<EmailForm />);

  const signUpButton = screen.getByText("Sign Up");

  fireEvent.click(signUpButton);

  expect(consoleSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();

  expect(screen.queryByText("Email can't be empty")).not.toBe(null);
});

test("Shows error if empty password", () => {
  const consoleSpy = jest.spyOn(console, "log");
  const warnSpy = jest.spyOn(console, "warn");

  render(<EmailForm />);

  const emailInput = screen.getByLabelText("Email");
  const signUpButton = screen.getByText("Sign Up");

  fireEvent.change(emailInput, { target: { value: "hello@test.com" } });

  fireEvent.click(signUpButton);

  expect(consoleSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();

  expect(screen.queryByText("Password can't be empty")).not.toBe(null);
});
