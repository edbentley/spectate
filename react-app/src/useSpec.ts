import {useState} from "react";

type SpecField = Variable | Component;
type Variable = StringText;
type Component = Input | Button;

type Input = { type: "input"; inputType?: HTMLInputElement["type"] };
type Button = { type: "button" };
type StringText = { type: "text" };

export const newInput = (opts?: { inputType?: HTMLInputElement["type"] }): Input => ({ ...opts, type: "input" });
export const newButton = (): Button => ({ type: "button" });
export const newText = (): StringText => ({ type: "text" });

type SpecFn = (args: {
  // User inputs
  enterText: (text: StringText, example: string) => void;
  clickOn: (component: Component) => void;
  // Actions
  sendPost: (json: Record<string, Variable>) => void;
}) => void;
export type NewSpec = (description: string, spec: SpecFn) => void;
type SpecProps<Spec> = Record<keyof Spec, any>;
type SpecState<Spec> = Record<keyof Spec, any>;
type SpecEvent =
  | { type: "sendPost"; json: Record<string, Variable> }
  | { type: "enterText"; text: StringText; example: string }
  | { type: "clickOn"; component: Component }

export function useSpec<Spec extends Record<string, SpecField>>(getSpec: (newSpec: NewSpec) => Spec): SpecProps<Spec> {

  const events: SpecEvent[] = [];

  const sendPost = (json: Record<string, Variable>) => {
    events.push({ type: "sendPost", json });
  }

  const enterText = (text: StringText, example: string) => {
    events.push({ type: "enterText", text, example });
  }

  const clickOn = (component: Component) => {
    events.push({ type: "clickOn", component });
  }

  const newSpec: NewSpec = (description, specFn) => {
    specFn({
      sendPost,
      enterText,
      clickOn
    });
  }

  const spec = getSpec(newSpec);

  const specProps = useGenerateSpecProps(spec, events);

  return specProps;
}

function useGenerateSpecProps<Spec extends Record<string, SpecField>>(spec: Spec, events: SpecEvent[]): SpecProps<Spec> {
  const [specState, setSpecState] = useState(getInitState(spec));

  const specProps: SpecProps<Spec> = {} as any;

  Object.entries(spec).forEach(([specName, specField]) => {
    // Only props for Component type
    if (specField.type !== "text") {
      specProps[specName as keyof Spec] = getPropsForField(specField, specState, setSpecState, events, spec);
    }
  });

  return specProps;
}

function getInitState<Spec extends Record<string, SpecField>>(spec: Spec): SpecState<Spec> {
  const specState: SpecState<Spec> = {} as any;

  Object.entries(spec).forEach(([specName, specField]) => {
    // Only state for Variable type
    if (specField.type === "text") {
      specState[specName as keyof Spec] = getStateForField(specField);
    }
  });

  return specState;

}

function getStateForField(specField: Variable) {
  switch (specField.type) {
    case "text":
      return "";
  }
}

function getStateKeyForVariable<Spec extends Record<string, SpecField>>(variable: Variable, spec: Spec) {
  return Object.entries(spec).find(([_, potentialSpecField]) => potentialSpecField === variable)![0];
}

function getPropsForField<Spec extends Record<string, SpecField>>(
  specField: Component,
  state: Record<keyof Spec, any>,
  setState: React.Dispatch<React.SetStateAction<Record<keyof Spec, any>>>,
  events: SpecEvent[],
  spec: Spec,
): React.HTMLProps<any> {

  switch (specField.type) {
    case "button":
      return {
        onClick: () => {
          events.forEach((event, index) => {
            if (event.type === 'clickOn' && event.component === specField) {
              // We're being clicked on
              const nextEvent = events[index + 1];

              // Check if next event is action
              if (nextEvent?.type === "sendPost") {
                const json: Record<string, string> = {};
                Object.entries(nextEvent.json).forEach(([key, variable]) => {
                  const varStateKey = getStateKeyForVariable(variable, spec);
                  json[key] = state[varStateKey];
                });
                console.log("POST", json);
              }
            }
          })
        }
      };

    case "input":
      let value = "";
      let onValueChange = (val: string) => {};

      events.forEach((event, index) => {
        if (event.type === 'clickOn' && event.component === specField) {
          // We're focussed
          const nextEvent = events[index + 1];

          // Check if next event is relevant user input
          if (nextEvent?.type === "enterText") {
            const varStateKey = getStateKeyForVariable(nextEvent.text, spec);
            value = state[varStateKey];
            onValueChange = val => setState(s => ({ ...s, [varStateKey]: val }));
          }
        }
      })
      return {
        value,
        onChange: event => {
          onValueChange((event.target as HTMLInputElement).value);
        },
        type: specField.inputType
      };
  }
}
