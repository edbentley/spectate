import React from "react";
import "./App.css";
import { useSpec } from "../react";
import { newInput, newButton } from "../core/components";
import { newText } from "../core/variables";
import { NewSpec } from "../core/spec";
import { newEffect } from "../core/effects";

const mySpec = (newSpec: NewSpec) => {
  const EmailInput = newInput();
  const EmailText = newText();

  const PasswordInput = newInput({ inputType: "password" });
  const PasswordText = newText();

  const ErrorText = newText();

  const SignUpButton = newButton();

  const PostJson = newEffect((getVal) => {
    console.log("POST", {
      email: getVal(EmailText),
      password: getVal(PasswordText),
    });
  });

  newSpec(
    "Can sign up with email and password",
    ({ clickOn, enterText, doEffect, equals }) => {
      clickOn(EmailInput);
      enterText(EmailText, "hi@test.com");

      clickOn(PasswordInput);
      enterText(PasswordText, "password!");

      clickOn(SignUpButton);

      doEffect(PostJson);
      equals(ErrorText, "");
    }
  );

  newSpec("Shows error if empty email", ({ clickOn, equals }) => {
    clickOn(SignUpButton);

    equals(ErrorText, "Email can't be empty");
  });

  newSpec("Shows error if empty password", ({ clickOn, enterText, equals }) => {
    clickOn(EmailInput);
    enterText(EmailText, "hi@test.com");

    clickOn(SignUpButton);

    equals(ErrorText, "Password can't be empty");
  });

  return {
    EmailInput,
    EmailText,
    PasswordInput,
    PasswordText,
    SignUpButton,
    ErrorText,
  };
};

function App() {
  const props = useSpec(mySpec);

  return (
    <div className="App">
      <label>
        Email <input {...props.EmailInput} />
      </label>

      <label>
        Password <input {...props.PasswordInput} />
      </label>

      <button {...props.SignUpButton}>Sign Up</button>

      {props.ErrorText && <span>{props.ErrorText}</span>}
    </div>
  );
}

export default App;
