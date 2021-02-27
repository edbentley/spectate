import React from 'react'
import './App.css'
import { useSpec } from "../react";
import { newInput, newButton, newComponentList } from '../core/components'
import { newText, newVarList } from '../core/variables'
import { NewSpec } from '../core/spec'
import { newEffect } from '../core/effects';

const mySpec = (newSpec: NewSpec) => {
  const NewCardInput = newInput();
  const NewCardText = newText();
  const PrevCardText = newText();

  const CardsList = newVarList(newText());

  const RemoveButtonsList = newComponentList(newButton(), CardsList);

  const AddButton = newButton();

  const LogCard = newEffect((getVal, { index }) => {
    // Was not the result of a component list
    if (index === undefined) return;

    console.log("Removing", getVal(CardsList)[index]);
  });

  newSpec("Can create multiple TODO cards", ({ clickOn, clickOnIndex, enterText, equals, doEffect }) => {
    clickOn(NewCardInput);
    enterText(NewCardText, "Wash the dishes");

    clickOn(AddButton);

    equals(CardsList, [NewCardText]);

    // Store for later
    equals(PrevCardText, NewCardText);

    equals(NewCardText, "");


    // 2nd time

    clickOn(NewCardInput);
    enterText(NewCardText, "Clean the kitchen");

    clickOn(AddButton);

    equals(CardsList, [PrevCardText, NewCardText]);

    equals(NewCardText, "");


    // Remove a card

    clickOnIndex(RemoveButtonsList, 1);

    // Log the value on the card
    doEffect(LogCard);

    equals(CardsList, [PrevCardText]);
  });

  return { NewCardInput, NewCardText, CardsList, AddButton, PrevCardText, RemoveButtonsList };
};


function App() {
  const props = useSpec(mySpec)


  return (
    <div className="App">
      <label>
        New Card{" "}
        <input {...props.NewCardInput} />
      </label>

      <button {...props.AddButton}>Add</button>

      {props.CardsList.map((text, index) => {
        const buttonProps = props.RemoveButtonsList(index);
        return <div key={index}>
          <span>{text}</span>
          <button {...buttonProps}>X</button>
        </div>
      })}
    </div>
  )
}

export default App
