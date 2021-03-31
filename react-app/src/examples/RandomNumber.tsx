import React from "react";
import {
  useSpec,
  newButton,
  NewSpec,
  newEffect,
  newText,
} from "../../../src/react";

const mySpec = (newSpec: NewSpec) => {
  const RandomNumber = newText();

  const GenerateButton = newButton();

  const GenerateRandomNumber = newEffect(() => {
    return (Math.random() * 10).toFixed(0);
  });

  newSpec("Can generate random numbers", ({ clickOn, getEffect, equals }) => {
    const initResult = getEffect(GenerateRandomNumber, "8");

    equals(RandomNumber, initResult);

    clickOn(GenerateButton);

    const buttonResult = getEffect(GenerateRandomNumber, "3");

    equals(RandomNumber, buttonResult);
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
