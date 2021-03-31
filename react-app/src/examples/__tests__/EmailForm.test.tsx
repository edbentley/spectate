import React from "react";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import EmailForm from "../EmailForm";

// Note: these tests are to confirm Spectate is working.
// You don't need to write them in your apps!

test("Can sign up with email and password", async () => {
  const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => null);
  const warnSpy = jest.spyOn(console, "warn");

  render(<EmailForm />);

  const emailInput = screen.getByLabelText("Email");
  const passwordInput = screen.getByLabelText("Password");
  const signUpButton = screen.getByText("Sign Up");

  fireEvent.change(emailInput, { target: { value: "hello@test.com" } });

  fireEvent.change(passwordInput, { target: { value: "my_password" } });

  fireEvent.click(signUpButton);

  await waitFor(() =>
    expect(consoleSpy).toHaveBeenCalledWith("POST", {
      email: "hello@test.com",
      password: "my_password",
    })
  );
  expect(warnSpy).not.toHaveBeenCalled();
});

test("Shows error if empty email", async () => {
  const consoleSpy = jest.spyOn(console, "log");
  const warnSpy = jest.spyOn(console, "warn");

  render(<EmailForm />);

  const signUpButton = screen.getByText("Sign Up");

  fireEvent.click(signUpButton);

  await screen.findByText("Email can't be empty");

  expect(consoleSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();
});

test("Shows error if empty password", async () => {
  const consoleSpy = jest.spyOn(console, "log");
  const warnSpy = jest.spyOn(console, "warn");

  render(<EmailForm />);

  const emailInput = screen.getByLabelText("Email");
  const signUpButton = screen.getByText("Sign Up");

  fireEvent.change(emailInput, { target: { value: "hello@test.com" } });

  fireEvent.click(signUpButton);

  await screen.findByText("Password can't be empty");

  expect(consoleSpy).not.toHaveBeenCalled();
  expect(warnSpy).not.toHaveBeenCalled();
});
