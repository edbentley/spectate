import React, { useMemo } from "react";
import { useSpec } from "../react";
import { newButton, newInput } from "../core/components";
import { NewSpec } from "../core/spec";
import { newEffect } from "../core/effects";
import { newText } from "../core/variables";

const appSpec = (newSpec: NewSpec) => {
  const UsernameText = newText();
  const UsernameInput = newInput(UsernameText);

  newSpec("Can type username", ({ clickOn, enterText }) => {
    clickOn(UsernameInput);

    enterText("hello");
  });

  return {
    UsernameInput,
    UsernameText,
  };
};

function App() {
  const props = useSpec(appSpec);

  return (
    <div className="App">
      <label>
        Username <input {...props.UsernameInput} />
      </label>

      <LogComponent username={props.UsernameText} />
    </div>
  );
}

const getLogSpec = (username: string) => (newSpec: NewSpec) => {
  const LogButton = newButton();
  const Log = newEffect(() => {
    console.log(username);
  });

  newSpec("Logs username prop when clicked on", ({ clickOn, doEffect }) => {
    clickOn(LogButton);

    doEffect(Log);
  });

  return {
    LogButton,
  };
};

function LogComponent({ username }: { username: string }) {
  // Note the spec is reprocessed every time username changes

  const mySpec = useMemo(() => getLogSpec(username), [username]);
  const props = useSpec(mySpec);

  return <button {...props.LogButton}>Log username</button>;
}

export default App;
