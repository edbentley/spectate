import React from "react";
import { useSpec } from "../react";
import { newInput, newButton, newComponentList } from "../core/components";
import { newText, newVarList } from "../core/variables";
import { NewSpec } from "../core/spec";
import { newEffect } from "../core/effects";

const mySpec = (newSpec: NewSpec) => {
  const NewCardText = newText();
  const NewCardInput = newInput(NewCardText);

  const CardsList = newVarList(newText());

  const CardInputsList = newComponentList(newInput(), CardsList);
  const RemoveButtonsList = newComponentList(newButton(), CardsList);

  const AddButton = newButton();

  const LogCard = newEffect((getVal, { index }) => {
    // Was not the result of a component list
    if (index === undefined) return;

    console.log("Removing", getVal(CardsList)[index]);
  });

  newSpec(
    "Can create multiple TODO cards",
    ({ clickOn, clickOnIndex, enterText, equals, doEffect }) => {
      clickOn(NewCardInput);
      enterText("Wash the dishes");

      clickOn(AddButton);

      equals(CardsList, [NewCardText]);

      equals(NewCardText, "");

      // 2nd time

      clickOn(NewCardInput);
      enterText("Clean the kitchen");

      clickOn(AddButton);

      equals(CardsList, ["Wash the dishes", NewCardText]);

      equals(NewCardText, "");

      // 3rd time

      clickOn(NewCardInput);
      enterText("Feed the cat");

      clickOn(AddButton);

      equals(CardsList, ["Wash the dishes", "Clean the kitchen", NewCardText]);

      equals(NewCardText, "");

      // Remove a card

      clickOnIndex(RemoveButtonsList, 1);

      // Log the value on the card
      doEffect(LogCard);

      equals(CardsList, ["Wash the dishes", "Feed the cat"]);

      // Add another

      clickOn(NewCardInput);
      enterText("Water the plants");

      clickOn(AddButton);

      equals(CardsList, ["Wash the dishes", "Feed the cat", NewCardText]);

      equals(NewCardText, "");

      // Can replace card

      clickOnIndex(CardInputsList, 0);
      enterText("Hang up clothes");
    }
  );

  newSpec(
    "Will not create card with empty text",
    ({ clickOn, enterText, equals }) => {
      clickOn(NewCardInput);
      enterText("");

      clickOn(AddButton);

      equals(CardsList, []);
    }
  );

  return {
    NewCardInput,
    NewCardText,
    CardsList,
    AddButton,
    CardInputsList,
    RemoveButtonsList,
  };
};

function App() {
  const props = useSpec(mySpec);

  return (
    <div className="App">
      <label>
        New Card <input {...props.NewCardInput} />
      </label>

      <button {...props.AddButton}>Add</button>

      {props.CardsList.map((_, index) => {
        const buttonProps = props.RemoveButtonsList(index);
        const inputsProps = props.CardInputsList(index);
        return (
          <div key={index}>
            <input {...inputsProps} />
            <button {...buttonProps}>X</button>
          </div>
        );
      })}
    </div>
  );
}

export default App;
