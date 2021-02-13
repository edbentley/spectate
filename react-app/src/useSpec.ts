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
  equals: (variable: Variable, value: string) => void;
}) => void;
export type NewSpec = (description: string, spec: SpecFn) => void;
type SpecProps<Spec> = Record<keyof Spec, any>;
type SpecState<Spec> = Record<keyof Spec, any>;

type Events = { specEvents: SpecEvent[]; specDescription: string }[];
type SpecEvent = SpecEventUserInput | SpecEventAction;
type SpecEventUserInput =
  | { type: "enterText"; text: StringText; example: string }
  | { type: "clickOn"; component: Component }
type SpecEventAction =
  | { type: "sendPost"; json: Record<string, Variable> }
  | { type: "equals"; variable: Variable; value: string }

export function useSpec<Spec extends Record<string, SpecField>>(getSpec: (newSpec: NewSpec) => Spec): SpecProps<Spec> {

  const events: Events = [];

  const sendPost = (index: number) => (json: Record<string, Variable>) => {
    events[index].specEvents.push({ type: "sendPost", json });
  }

  const enterText = (index: number) =>(text: StringText, example: string) => {
    events[index].specEvents.push({ type: "enterText", text, example });
  }

  const clickOn = (index: number) =>(component: Component) => {
    events[index].specEvents.push({ type: "clickOn", component });
  }

  const equals = (index: number) =>(variable: Variable, value: string) => {
    events[index].specEvents.push({ type: "equals", variable, value });
  }

  const newSpec: NewSpec = (description, specFn) => {
    const index = events.length;
    events.push({ specEvents: [], specDescription: description });
    specFn({
      sendPost: sendPost(index),
      enterText: enterText(index),
      clickOn: clickOn(index),
      equals: equals(index)
    });
  }

  const spec = getSpec(newSpec);

  const specProps = useGenerateSpecProps(spec, events);

  return specProps;
}

function useGenerateSpecProps<Spec extends Record<string, SpecField>>(spec: Spec, events: Events): SpecProps<Spec> {
  const [specState, setSpecState] = useState(getInitState(spec));

  const specProps: SpecProps<Spec> = {} as any;

  Object.entries(spec).forEach(([specName, specField]) => {
    if (specField.type !== "text") {
      // Props for Component type
      specProps[specName as keyof Spec] = getPropsForField(specField, specState, setSpecState, events, spec);
    } else {
      // Props is state for Variable type
      specProps[specName as keyof Spec] = specState[specName];
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
  state: SpecState<Spec>,
  setState: React.Dispatch<React.SetStateAction<SpecState<Spec>>>,
  events: Events,
  spec: Spec,
): React.HTMLProps<any> {

  switch (specField.type) {
    case "button":
      return {
        onClick: () => {
          const possibleActions: {fns: (() => void)[]; stateSimilarity: number; specDescription: string}[] = [];

          events.forEach(({ specEvents, specDescription }) => {
            specEvents.reduce((prevSpecState, event, index) => {
              const specState = updateSpecState(prevSpecState, event, spec);

              if (event.type === 'clickOn' && event.component === specField) {
                // We're being clicked on, gather up the next action events

                // We're the last event
                if (index === specEvents.length - 1) return specState;

                let nextActionEventsEndIndex = specEvents.slice(index + 1).findIndex(event => !isAction(event));
                if (nextActionEventsEndIndex === -1) {
                  nextActionEventsEndIndex = specEvents.length;
                }

                const nextActionEvents = specEvents.slice(index + 1, index + 1 + nextActionEventsEndIndex);

                const fns: (() => void)[] = [];

                nextActionEvents.forEach(nextEvent => {
                  if (nextEvent.type === "sendPost") {
                    const json: Record<string, string> = {};
                    Object.entries(nextEvent.json).forEach(([key, variable]) => {
                      const varStateKey = getStateKeyForVariable(variable, spec);
                      json[key] = state[varStateKey];
                    });
                    fns.push(
                      () => {
                        console.log("POST", json);
                      }
                    );
                  } else if (nextEvent.type === "equals") {
                    // We change some state on equals
                    const varStateKey = getStateKeyForVariable(nextEvent.variable, spec);
                    fns.push(
                      () => {
                        setState(s => ({...s, [varStateKey]: nextEvent.value }));
                      }
                    );
                  }
                })

                possibleActions.push({
                  fns,
                  stateSimilarity: getSimilarityScore(specState, state),
                  specDescription
                });
              }
              return specState;
            }, getInitState(spec));
          })

          // We choose action whose state most closely matches current state
          if (possibleActions.length > 0) {
            const actionsRanked = possibleActions.sort(({ stateSimilarity: similarityA }, { stateSimilarity: similarityB }) => {
              return similarityB - similarityA;
            });

            if (actionsRanked.length > 1 && actionsRanked[0].stateSimilarity === actionsRanked[1].stateSimilarity) {
              console.warn(`Warning: couldn't decide best spec to choose. Possible specs:
- ${actionsRanked[0].specDescription} (chosen)
- ${actionsRanked[1].specDescription}`)
            }

            actionsRanked[0].fns.forEach(fn => {
              fn();
            });
          }

        }
      };

    case "input":
      let value = "";
      let onValueChange = (val: string) => {};

      // TODO
      events[0].specEvents.forEach((event, index) => {
        if (event.type === 'clickOn' && event.component === specField) {
          // We're focussed
          const nextEvent = events[0].specEvents[index + 1];

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

function updateSpecState<Spec extends Record<string, SpecField>>(prevSpecState: SpecState<Spec>, event: SpecEvent, spec: Spec): SpecState<Spec> {
  switch (event.type) {
    case "enterText":
      const varStateKey = getStateKeyForVariable(event.text, spec);

      return {
        ...prevSpecState,
        [varStateKey]: event.example
      }

    default:
      return prevSpecState
  }
}

function isAction(specEvent: SpecEvent): specEvent is SpecEventAction {
  return specEvent.type === "equals" || specEvent.type === "sendPost";
}
function isUserInput(specEvent: SpecEvent): specEvent is SpecEventUserInput {
  return specEvent.type === "clickOn" || specEvent.type === "enterText";
}

function getSimilarityScore<Spec extends Record<string, SpecField>>(state1: SpecState<Spec>, state2: SpecState<Spec>) {
  return Object.entries(state1).reduce((total, [fieldName, fieldVal]) => {
    // For strings, compare if empty or not
    if (Boolean(state2[fieldName]) === Boolean(fieldVal)) {
      return total + 1;
    }
    return total;
  }, 0);
}
