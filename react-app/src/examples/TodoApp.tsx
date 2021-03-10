import React from "react";
import "./App.css";
import { useSpec } from "../react";
import { newInput, newButton, newComponentList } from "../core/components";
import { newText, newVarList } from "../core/variables";
import { NewSpec } from "../core/spec";
import { newEffect } from "../core/effects";

const mySpec = (newSpec: NewSpec) => {
  const NewCardInput = newInput();
  const NewCardText = newText();
  const PrevCardText1 = newText();
  const PrevCardText2 = newText();
  const PrevCardText3 = newText();

  const CardsList = newVarList(newText());

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
      enterText(NewCardText, "Wash the dishes");

      clickOn(AddButton);

      equals(CardsList, [NewCardText]);

      // Store for later
      equals(PrevCardText1, NewCardText);

      equals(NewCardText, "");

      // 2nd time

      clickOn(NewCardInput);
      enterText(NewCardText, "Clean the kitchen");

      clickOn(AddButton);

      equals(CardsList, [PrevCardText1, NewCardText]);

      // Store for later
      equals(PrevCardText2, NewCardText);

      equals(NewCardText, "");

      // 3rd time

      clickOn(NewCardInput);
      enterText(NewCardText, "Feed the cat");

      clickOn(AddButton);

      equals(CardsList, [PrevCardText1, PrevCardText2, NewCardText]);

      // Store for later
      equals(PrevCardText3, NewCardText);

      equals(NewCardText, "");

      // Remove a card

      clickOnIndex(RemoveButtonsList, 1);

      // Log the value on the card
      doEffect(LogCard);

      equals(CardsList, [PrevCardText1, PrevCardText3]);

      // Add another

      clickOn(NewCardInput);
      enterText(NewCardText, "Water the plants");

      clickOn(AddButton);

      equals(CardsList, [PrevCardText1, PrevCardText3, NewCardText]);

      equals(NewCardText, "");
    }
  );

  newSpec(
    "Will not create card with empty text",
    ({ clickOn, enterText, equals }) => {
      clickOn(NewCardInput);
      enterText(NewCardText, "");

      clickOn(AddButton);

      equals(CardsList, []);
    }
  );

  return {
    NewCardInput,
    NewCardText,
    CardsList,
    AddButton,
    PrevCardText1,
    PrevCardText2,
    PrevCardText3,
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

      {props.CardsList.map((text, index) => {
        const buttonProps = props.RemoveButtonsList(index);
        return (
          <div key={index}>
            <span>{text}</span>
            <button {...buttonProps}>X</button>
          </div>
        );
      })}
    </div>
  );
}

export default App;
