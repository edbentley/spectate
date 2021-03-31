import React, { useState } from "react";
import ReactDOM from "react-dom";
import "./index.css";
import EmailForm from "./examples/EmailForm";
import FetchUser from "./examples/FetchUser";
import Nested from "./examples/Nested";
import RandomNumber from "./examples/RandomNumber";
import TodoApp from "./examples/TodoApp";

function App() {
  const [View, setView] = useState(<EmailForm />);

  return (
    <>
      <SelectView setView={setView} />
      {View}
    </>
  );
}

function SelectView(props: { setView: (el: JSX.Element) => void }) {
  const [viewFileName, setViewFileName] = useState("EmailForm");

  return (
    <div className="Select">
      <div className="row">
        <button
          onClick={() => {
            props.setView(<EmailForm />);
            setViewFileName("EmailForm");
          }}
        >
          Signup form
        </button>
        <button
          onClick={() => {
            props.setView(<FetchUser />);
            setViewFileName("FetchUser");
          }}
        >
          Fetch User
        </button>
        <button
          onClick={() => {
            props.setView(<Nested />);
            setViewFileName("Nested");
          }}
        >
          Nested spec
        </button>
        <button
          onClick={() => {
            props.setView(<RandomNumber />);
            setViewFileName("RandomNumber");
          }}
        >
          Random
        </button>
        <button
          onClick={() => {
            props.setView(<TodoApp />);
            setViewFileName("TodoApp");
          }}
        >
          TODO app
        </button>
      </div>
      <a
        href={`https://github.com/edbentley/spectate/tree/master/react-app/src/examples/${viewFileName}.tsx`}
      >
        View Code
      </a>
    </div>
  );
}

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);
