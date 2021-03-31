import React from "react";
import "./App.css";
import { useSpec } from "../react";
import { newButton } from "../core/components";
import { newText } from "../core/variables";
import { NewSpec } from "../core/spec";
import { newEffect } from "../core/effects";

const mySpec = (newSpec: NewSpec) => {
  const Username = newText();
  const Status = newText();

  const FetchButton = newButton();

  const FetchRandomUsername = newEffect(async () => {
    // There's a chance this will choose an invalid number (to see fail state)
    const userNumber = Math.floor(Math.random() * 15);

    const response = await fetch(
      `https://jsonplaceholder.typicode.com/users/${userNumber}`
    );
    if (response.ok) {
      const json = await response.json();
      return json.name;
    }
    return "";
  });

  newSpec("Can show username", ({ clickOn, getEffect, equals }) => {
    clickOn(FetchButton);

    equals(Status, "Loading");

    const result = getEffect(FetchRandomUsername, "7fb6ff5");

    equals(Username, result);
    equals(Status, "");
  });

  newSpec("Shows error if no username", ({ clickOn, getEffect, equals }) => {
    clickOn(FetchButton);

    equals(Status, "Loading");

    getEffect(FetchRandomUsername, "");

    equals(Username, "");
    equals(Status, "Couldn't get user");
  });

  return {
    FetchButton,
    Username,
    Status,
  };
};

function App() {
  const props = useSpec(mySpec);

  return (
    <div className="App">
      <button {...props.FetchButton}>Fetch</button>

      {props.Username && <span>Username: {props.Username}</span>}
      {props.Status && <span>{props.Status}</span>}
    </div>
  );
}

export default App;
