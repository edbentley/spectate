import {useState} from "react";

type SpecField = Variable | Component | Effect;
type Variable = StringText;
type Component = Input | Button;
type Effect = { type: "effect"; fn: (getVal: GetValFromVariable) => void };

type Input = { type: "input"; inputType?: HTMLInputElement["type"] };
type Button = { type: "button" };
type StringText = { type: "text" };

type GetValFromVariable = (variable: Variable) => string;

export const newInput = (opts?: { inputType?: HTMLInputElement["type"] }): Input => ({ ...opts, type: "input" });
export const newButton = (): Button => ({ type: "button" });
export const newText = (): StringText => ({ type: "text" });
export const newEffect = (fn: (getVal: GetValFromVariable) => void): Effect => ({ type: "effect", fn });

type SpecFn = (args: {
  // User inputs
  enterText: (text: StringText, example: string) => void;
  clickOn: (component: Component) => void;
  // Actions
  doEffect: (action: Effect) => void;
  equals: (variable: Variable, value: string) => void;
}) => void;
export type NewSpec = (description: string, spec: SpecFn) => void;

type SpecProps<Spec> = {
  [K in keyof Spec]: Spec[K] extends StringText ?
    string : Spec[K] extends Input ?
    React.InputHTMLAttributes<HTMLInputElement> : Spec[K] extends Button ?
    React.ButtonHTMLAttributes<HTMLButtonElement> : never;
}

type SpecState<Spec> = {
  [K in keyof Spec]: Spec[K] extends StringText ? string : never;
}
type SpecStateWithFocus<Spec> = { state: SpecState<Spec>; focus: Component | null };

type Events = { specEvents: SpecEvent[]; specDescription: string }[];
type SpecEvent = SpecEventUserInput | SpecEventAction | SpecEventFocus;
type SpecEventFocus =
  | { type: "clickOn"; component: Component }
type SpecEventUserInput =
  | { type: "enterText"; text: StringText; example: string }
type SpecEventAction =
  | { type: "doEffect"; action: Effect }
  | { type: "equals"; variable: Variable; value: string }

export function useSpec<Spec extends Record<string, SpecField>>(getSpec: (newSpec: NewSpec) => Spec): SpecProps<Spec> {

  const events: Events = [];

  const doEffect = (index: number) => (action: Effect) => {
    events[index].specEvents.push({ type: "doEffect", action });
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
      doEffect: doEffect(index),
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
    if (isComponent(specField)) {
      // Props for Component type
      specProps[specName as keyof Spec] = getPropsForField(specField, specState, setSpecState, events, spec) as any;
    } else if (isVariable(specField)) {
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
      specState[specName as keyof Spec] = getStateForField(specField) as any;
    }
  });

  return specState;
}

function getInitStateWithFocus<Spec extends Record<string, SpecField>>(spec: Spec): SpecStateWithFocus<Spec> {
  return {
    state: getInitState(spec),
    focus: null
  }
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
                  if (nextEvent.type === "doEffect") {
                    fns.push(() => nextEvent.action.fn(variable => {
                      const varStateKey = getStateKeyForVariable(variable, spec);
                      return state[varStateKey];
                    }));
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
                  stateSimilarity: getSimilarityScore(specState.state, state),
                  specDescription
                });
              }
              return specState;
            }, getInitStateWithFocus(spec));
          })

          // We choose action based on whose state most closely matches current state
          if (possibleActions.length > 0) {
            const actionsRanked = possibleActions.sort(({ stateSimilarity: similarityA }, { stateSimilarity: similarityB }) => {
              return similarityB - similarityA;
            });

            const clashingSpecs = actionsRanked.slice(1).filter(
              action => action.stateSimilarity === actionsRanked[0].stateSimilarity
            );

            if (clashingSpecs.length > 0) {
              const clashingSpecNames = clashingSpecs.map(x => `- ${x.specDescription}`);
              console.warn(`Warning: couldn't decide best spec to choose for ${specField.type}. Possible specs:
- ${actionsRanked[0].specDescription} (chosen)
${clashingSpecNames.join("\n")}`)
            }

            actionsRanked[0].fns.forEach(fn => {
              fn();
            });
          }

        }
      };

    case "input":
      const possibleProps: {
        connectedVariable: Variable;
        value: string;
        onValueChange: (val: string) => void;
        stateSimilarity: number;
        specDescription: string
      }[] = [];

      events.forEach(({ specEvents, specDescription }) => {
        specEvents.reduce((prevSpecState, event) => {
          const specState = updateSpecState(prevSpecState, event, spec);

          if (event.type === "enterText" && specState.focus === specField) {
            // We're focussed, so this input is now connected with text Variable entered
            const connectedVariable = event.text;

            const varStateKey = getStateKeyForVariable(connectedVariable, spec);

            possibleProps.push({
              connectedVariable,
              value: state[varStateKey],
              onValueChange: val => {
                setState(s => ({ ...s, [varStateKey]: val }));
              },
              stateSimilarity: getSimilarityScore(specState.state, state),
              specDescription
            });
          }

          return specState;
        }, getInitStateWithFocus(spec));
      })

      // We choose prop based on whose state most closely matches current state
      if (possibleProps.length > 0) {
        const propsRanked = possibleProps.sort(({ stateSimilarity: similarityA }, { stateSimilarity: similarityB }) => {
          return similarityB - similarityA;
        });

        const clashingSpecs = propsRanked.slice(1).filter(
          prop => prop.stateSimilarity === propsRanked[0].stateSimilarity &&
          prop.connectedVariable !== propsRanked[0].connectedVariable
        );

        if (clashingSpecs.length > 0) {
          const clashingSpecNames = clashingSpecs.map(x => `- ${x.specDescription}`);
          console.warn(`Warning: couldn't decide best spec to choose for ${specField.type}. Possible specs:
- ${propsRanked[0].specDescription} (chosen)
${clashingSpecNames.join("\n")}`)
        }

        return {
          value: propsRanked[0].value,
          onChange: event => {
            propsRanked[0].onValueChange((event.target as HTMLInputElement).value);
          },
          type: specField.inputType
        }
      }

      return {
        value: "",
        onChange: () => {},
      };
  }
}

function updateSpecState<Spec extends Record<string, SpecField>>(prevSpecState: SpecStateWithFocus<Spec>, event: SpecEvent, spec: Spec): SpecStateWithFocus<Spec> {
  switch (event.type) {
    case "enterText":
      const varStateKey = getStateKeyForVariable(event.text, spec);

      return {
        ...prevSpecState,
        state: {
          ...prevSpecState.state,
          [varStateKey]: event.example
        },
      }

    case "clickOn":
      const focussedComponent = event.component;
      return {
        ...prevSpecState,
        focus: focussedComponent
      }

    default:
      return prevSpecState
  }
}

function isAction(specEvent: SpecEvent): specEvent is SpecEventAction {
  return specEvent.type === "equals" || specEvent.type === "doEffect";
}
function isUserInput(specEvent: SpecEvent): specEvent is SpecEventUserInput {
  return specEvent.type === "enterText";
}

function isVariable(specField: SpecField): specField is Variable {
  return specField.type === "text";
}
function isComponent(specField: SpecField): specField is Component {
  return specField.type === "input" || specField.type === "button";
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
