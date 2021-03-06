# Spectate

Writing UI code and then tests can be laborious. What if we could just write the tests describing what the app should do, and have that generate the UI code? 🤔

Spectate is a library that can generate UI logic through the tests you write (the specs). It slots in to React as a state manager so you only need to write the markup - and can be made to work with other UI libraries too.

## ⚠️ Status

Spectate is an exciting new research project, but it's still a prototype. It only supports a few use cases, likely has many bugs and is not well optimised. Have a try to discover a new way of building UIs, but it's not recommended for use in production!

## Examples

Fully working examples demonstrating Spectate can be seen in [this live demo](https://edbentley.github.io/spectate).

## Usage

```
npm install @spectate/react
```

Then write your own component and its specs together. Specs should read like tests and describe what the app should do during user interactions.

Here's an example of a signup page:

```js
import React from "react";
import {
  useSpec,
  newButton,
  newInput,
  NewSpec,
  newEffect,
  newText,
} from "@spectate/react";

// Remove ": NewSpec" if you're not using TypeScript

const mySpec = (newSpec: NewSpec) => {
  const EmailText = newText();
  const EmailInput = newInput(EmailText);

  const PasswordText = newText();
  const PasswordInput = newInput({
    inputType: "password",
    connectedVar: PasswordText,
  });

  const ErrorText = newText();

  const SignUpButton = newButton();

  const PostJson = newEffect((getVal) => {
    console.log("POST", {
      email: getVal(EmailText),
      password: getVal(PasswordText),
    });
  });

  newSpec(
    "Can sign up with email and password",
    ({ clickOn, enterText, doEffect, equals }) => {
      clickOn(EmailInput);
      enterText("hi@test.com");

      clickOn(PasswordInput);
      enterText("password!");

      clickOn(SignUpButton);

      doEffect(PostJson);
      equals(ErrorText, "");
    }
  );

  newSpec("Shows error if empty email", ({ clickOn, equals }) => {
    clickOn(SignUpButton);

    equals(ErrorText, "Email can't be empty");
  });

  newSpec("Shows error if empty password", ({ clickOn, enterText, equals }) => {
    clickOn(EmailInput);
    enterText("hi@test.com");

    clickOn(SignUpButton);

    equals(ErrorText, "Password can't be empty");
  });

  return {
    EmailInput,
    EmailText,
    PasswordInput,
    PasswordText,
    SignUpButton,
    ErrorText,
  };
};

function App() {
  const props = useSpec(mySpec);

  return (
    <div>
      <label>
        Email <input {...props.EmailInput} />
      </label>

      <label>
        Password <input {...props.PasswordInput} />
      </label>

      <button {...props.SignUpButton}>Sign Up</button>

      {props.ErrorText && <span>{props.ErrorText}</span>}
    </div>
  );
}

export default App;
```

## API

### Variables

#### newText

Creates a text variable to be used in a spec.

#### newVarList(variable)

Creates a spec list variable, argument should be the type of the list.

```js
const MyTextList = newVarList(newText());
```

### Components

#### newInput(textVar)

Creates an input to be used in a spec. Argument can be a text variable, or object with connected text variable and input type:

```js
const MyInput = newInput({
  connectedVar: myText,
  inputType: "password",
});
```

#### newButton()

Creates a button to be used in a spec.

#### newComponentList(component, listVariable)

Creates a spec component list, arguments should be the component type of the list and its connected list variable.

```js
const MyButtonList = newComponentList(newButton(), MyTextList);
```

### Effects

#### newEffect((getVal) => void)

Creates an effect to be used in a spec. Argument is a function which runs effectful code (e.g. IO), and can optionally return a value (including a Promise). The function argument has its own argument `getVal` to get the value of spec variables inside the effect.

```js
const MyEffect = newEffect((getVal) => {
  console.log("POST", {
    email: getVal(EmailText),
    password: getVal(PasswordText),
  });
});
```

### newSpec(description, spec)

`newSpec` is the argument of your spec function. `newSpec` is itself a function to describe individual spec cases.

```js
newSpec("Do thing", (args) => {
  // ...
});
```

The `args` of `newSpec` is an object with the following fields to describe your app:

#### clickOn(component)

Click on a component. Clicking on an input will focus it.

#### clickOnIndex(componentList, index)

Click on a component within a list.

#### enterText(example)

Enter text into the currently focussed input. Currently Spectate will only distinguish between empty example values (`""` and `[]`) and non-empty values to define different behaviour.

#### doEffect(effect)

Run the effect.

#### getEffect(effect, example)

Run the effect and save its return value. This can be used later in the spec.

```js
const result = getEffect(FetchRandomId, "7fb6ff5");
equals(MyId, result);
```

#### equals(variable, value)

Set the variable to the value passed in. Value can be a literal, another variable or the result of an effect.

### useSpec(mySpec)

A React hook that takes a spec function describing the behaviour of the component. Returns props to pass into React elements whose names match the return object of the spec function.

```js
const mySpec = (newSpec) => {
  // ...
  return {
    MyInput, // ---> props.MyInput
    MyText, // ---> props.MyText
  }
}
function App() {
  const props = useSpec(mySpec);
  // ...
}
```

## How Spectate works

**tl;dr: The app is simulated in the spec and the state and behaviour at every user interaction is saved into a model. When you interact with the app for real (like clicking a button), the real app state is matched with the most similar state in the model, thus providing what the behaviour should be.**

Spectate works similar to a compiler for a programming language.

Initially you use functions to create your variables (e.g. `newText()`), components (e.g. `newButton()`) and effects (`newEffect()`). At the end of your specs you must return the variables and components used in them (but no need to return effects).

### Phase 1: Parse events

Spectate will run each `newSpec` function and tracks events as you call them. E.g. `clickOn(Button)` will create a `"clickOn"` event with the component clicked on. These are stored in one array for each `newSpec` function, which we'll just call a spec - i.e. an app can have one or more specs.

### Phase 2: Generate model

Using the variables returned, an initial state is generated. This is a big object whose keys are the variable name and values are the variable's initial state. For example, text variables will have an initial value of `""` and lists will be `[]`.

Each spec's array of events is looped through in order using the initial state _independently_. After each step, the state is updated depending on the event. For example, calling `equals(ErrorText, "Email can't be empty")` will set the state of the key `ErrorText` to the string provided.

While this is happening, an 'events model' is being generated **which is universal to all specs**. E.g. the `"clickOn"` event will create a 'button event' in the model which contains:

- The current state
- The button clicked on
- The actions proceeding the click (i.e. non user-generated events like `equals` that follow in the array) - until the next user-generated event (like `clickOn`)
- The spec and event index, for debugging error messages

If two of the same type of event are called (e.g. you call `clickOn(Button)` twice) Spectate will decide if they're _equivalent_ or not. To be equivalent, the state of the app must be equivalent, or the actions proceeding the click must be equivalent. "Equivalent" is defined as having a [similarity score](#similarity-score) of 1 for every state field. If they are equivalent, they are kept as one 'button event'. Otherwise, two separate button events are stored in the model.

In the case that the state is equivalent, but the actions are not, Spectate throws a "conflicting actions" error. This ensures consistency in the app.

### Phase 3: Define component handlers

The next step is generating handlers for components - e.g. in React, this would be the `onClick` prop for a button.

Each component returned in the spec is given its own handler dependent on the component type.

For buttons, the component handler is a function whose argument is the app's state at the time its `onClick` is called. When the button is clicked on and the component handler is called, it will look at all of the 'button events' generated in the model in Phase 2 and find the one whose state is most _similar_ to the current app state passed in.

"Most similar" is defined as having the highest [similarity score](#similarity-score). Although not perfect, this should find an event whose behaviour resembles the desired behaviour of a user input when defining the specs. If it's not, you can always write more specs to clarify.

Using this chosen 'button event', the actions are run and the app's state is updated - e.g. an `equals(MyVar1, MyVar2)` event will update the app's state (key `MyVar`) with the value of `MyVar2`, i.e. `appState["MyVar1"] = appState["MyVar2"]`.

### Similarity Score

State fields can have a similarity score with another field of 0 or 1. Fields of different types will score 0. Two text fields will score 1 if they're both empty or both non-empty. Two list fields will score 1 if they're the same length.

### Lists

Variable lists work in a different way to ordinary variables. Using the specs, Spectate will try to narrow down the behaviour of the array (e.g. when you add to it, is it at the end or the beginning?), and so the behaviour must remain consistent through the app.

Component lists have to be connected to a variable list. This allows Spectate to determine the behaviour of a component using its index (e.g. if I click on the 10th button, and the 10th item in the variable list is removed, then it must be removing from the variable list at the button's index).

In Phase 2, setting an array variable will save the potential array behaviours in the 'events model' as a 'variable list behaviour'. E.g. if you call `equals(MyArray, ["Carrot"])`) and `MyArray` is empty, the behaviour could be to add at the beginning, end or at a specific index (if it was added to with a component in a list).

If in another spec you called `equals(MyArray, [])` when adding to the array and `MyArray` is empty, Spectate will throw an "inconsistent list behaviours" error.

After adding potential behaviour to the 'events model', the `equals` event is also updated to include information on its behaviour: whether it is adding or removing from the array - and if it is adding, the variable / value that is being added. This can be done since in Phase 2 the current state and how it changes is being tracked. This add or remove behaviour **can vary between events** - however the behaviour of _where_ a particular variable list is added to / removed from is **universal to all specs**.

At the end of Phase 2, the 'events model' is checked to ensure the add and remove behaviour of every variable list has been narrowed down to one option - otherwise a warning is provided.

In Phase 3, the component handlers for a list of buttons are defined by the index clicked on and the app's state.

First the component list's connected variable list is looked up to find out its add and remove behaviour.

Then the most relevant event is found based on the app's state. The event's actions are run with the index of the button clicked on and the variable list's behaviours included as an input - this allows Spectate to know how to update the app's state.
