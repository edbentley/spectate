import React from 'react'
import './App.css'
import { useSpec, newInput, newText, newButton, NewSpec } from './useSpec'

const mySpec = (newSpec: NewSpec) => {
  const EmailInput = newInput();
  const EmailText = newText();

  const PasswordInput = newInput({ inputType: "password" });
  const PasswordText = newText();

  const ErrorText = newText();

  const SignUpButton = newButton();

  newSpec("Can sign up with email and password", ({ clickOn, enterText, sendPost, equals }) => {
    clickOn(EmailInput);
    enterText(EmailText, "hi@test.com");

    clickOn(PasswordInput);
    enterText(PasswordText, "password!");

    clickOn(SignUpButton);

    sendPost({ email: EmailText, password: PasswordText });
    equals(ErrorText, "");
  });

  newSpec("Shows error if empty email", ({ clickOn, enterText, equals }) => {
    clickOn(SignUpButton);

    equals(ErrorText, "Email can't be empty");
  });

  newSpec("Shows error if empty password", ({ clickOn, enterText, equals }) => {
    clickOn(EmailInput);
    enterText(EmailText, "hi@test.com");

    clickOn(SignUpButton);

    equals(ErrorText, "Password can't be empty");
  });

  return { EmailInput, EmailText, PasswordInput, PasswordText, SignUpButton, ErrorText };
};


function App() {
  const props = useSpec(mySpec)

  return (
    <div className="App">
      <label>
        Email{" "}
        <input onChange {...props.EmailInput} />
      </label>

      <label>
        Password{" "}
        <input {...props.PasswordInput} />
      </label>

      <button {...props.SignUpButton}>Sign Up</button>

      {props.ErrorText && <span>{props.ErrorText}</span>}
    </div>
  )
}

export default App
