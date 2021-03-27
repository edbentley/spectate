import React from "react";
import "./App.css";
import { useSpec } from "../react";
import { newButton } from "../core/components";
import { newText } from "../core/variables";
import { NewSpec } from "../core/spec";
import { newEffect } from "../core/effects";

const mySpec = (newSpec: NewSpec) => {
  const UserId = newText();
  const ErrorMessage = newText();

  const FetchButton = newButton();

  const FetchUserId = newEffect(() => {
    return Math.random() < 0.5 ? "" : "9a31495d";
  });

  newSpec("Can show user ID", ({ clickOn, getEffect, equals }) => {
    clickOn(FetchButton);

    const result = getEffect(FetchUserId, "7fb6ff5");

    equals(UserId, result);
    equals(ErrorMessage, "");
  });

  newSpec("Shows error if no user ID", ({ clickOn, getEffect, equals }) => {
    clickOn(FetchButton);

    getEffect(FetchUserId, "");

    equals(UserId, "");
    equals(ErrorMessage, "Couldn't get user");
  });

  return {
    FetchButton,
    UserId,
    ErrorMessage,
  };
};

function App() {
  const props = useSpec(mySpec);

  return (
    <div className="App">
      <button {...props.FetchButton}>Fetch</button>

      {props.UserId && <span>User ID: {props.UserId}</span>}
      {props.ErrorMessage && <span>{props.ErrorMessage}</span>}
    </div>
  );
}

export default App;
