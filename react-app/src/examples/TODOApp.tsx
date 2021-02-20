import React from 'react'
import './App.css'
import { useSpec } from "../react";
import { newInput, newButton } from '../core/components'
import { newText, newTextList } from '../core/variables'
import { NewSpec } from '../core/spec'

const mySpec = (newSpec: NewSpec) => {
  const NewCardInput = newInput();
  const NewCardText = newText();
  const PrevCardText = newText();

  const CardsList = newTextList();

  const AddButton = newButton();

  newSpec("Can create multiple TODO cards", ({ clickOn, enterText, doEffect, equals }) => {
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
  });

  return { NewCardInput, NewCardText, CardsList, AddButton, PrevCardText };
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

      {props.CardsList.map((text, index) => <span key={index}>{text}</span>)}
    </div>
  )
}

export default App
