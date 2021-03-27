import React from "react";
import "./App.css";
import { useSpec } from "../react";
import { newButton } from "../core/components";
import { newText } from "../core/variables";
import { NewSpec } from "../core/spec";
import { newEffect } from "../core/effects";

const mySpec = (newSpec: NewSpec) => {
  const RandomNumber = newText();

  const GenerateButton = newButton();

  const GenerateRandomNumber = newEffect(() => {
    return (Math.random() * 10).toFixed(0);
  });

  newSpec("Can generate random numbers", ({ clickOn, getEffect, equals }) => {
    clickOn(GenerateButton);

    const result = getEffect(GenerateRandomNumber, "8");

    equals(RandomNumber, result);
  });

  return {
    GenerateButton,
    RandomNumber,
  };
};

function App() {
  const props = useSpec(mySpec);

  return (
    <div className="App">
      <button {...props.GenerateButton}>Generate</button>

      {props.RandomNumber && <span>{props.RandomNumber}</span>}
    </div>
  );
}

export default App;
