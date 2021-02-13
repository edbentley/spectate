import React from 'react'
import './App.css'
import { useSpec, newInput, newText, newButton, NewSpec } from './useSpec'

const mySpec = (newSpec: NewSpec) => {
  const EmailInput = newInput();
  const EmailText = newText();

  const PasswordInput = newInput({ inputType: "password" });
  const PasswordText = newText();

  const SignUpButton = newButton();

  newSpec("Can sign up with email and password", ({ clickOn, enterText, sendPost }) => {
    clickOn(EmailInput);
    enterText(EmailText, "hi@test.com");

    clickOn(PasswordInput);
    enterText(PasswordText, "password!");

    clickOn(SignUpButton);

    sendPost({ email: EmailText, password: PasswordText });
  });

  return { EmailInput, EmailText, PasswordInput, PasswordText, SignUpButton };
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
    </div>
  )
}

export default App
