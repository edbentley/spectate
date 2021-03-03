import { Button, Component, ComponentList, getComponentName, Input, isComponent } from "./components";
import { NewSpec, SpecBase } from "./spec";
import { getInitSpecState, SpecState, statesEqual, getSimilarityScore, getValueFromState } from "./state";
import { actionsEqual, EventContext, Events, getNextActions, SpecEvent, SpecEventAction } from "./events"
import { compareBehaviours, getVariableName, isVariable, ListAddBehaviour, ListBehaviours, ListRemoveBehaviour, TextVar, Variable, VariableComparitor, VariableList, VariableValue } from "./variables";
import { Effect } from "./effects";


export interface SpecComponentHandlers<Spec extends SpecBase> {
  // Record of key: button name, val: onClick function determined using similarity scores
  buttons: Record<string, (appState: SpecState<Spec>) => { onClick: () => void }>;

  // Record of key: input name, val: onChange function determined using similarity scores
  inputs: Record<string, (appState: SpecState<Spec>) => { connectedVariableName: null | string; onChange: (value: string) => void }>,

  // Record of key: list name, val: button or input fields with index passed in
  lists: Record<string, (appState: SpecState<Spec>) =>
    | { onClick: (index: number) => void }
    | { connectedVariableName: string; onChange: (value: string, index: number) => void }>;
}



type EventsModel<Spec extends SpecBase> = {
  // Key is component name
  buttonEvents: Record<string, {
    // State at this point
    state: SpecState<Spec>;
    // The button clicked on
    button: Button;
    // Actions following click
    // An error is thrown if button and state are the same but actions different
    actions: SpecEventAction[];
    // Can be multiple positions if fields above are the same in multiple specs
    positions: { specIndex: number; eventIndex: number }[];
  }[]>;

  // Key is component name
  // We only care about enterText here, not clickOn
  inputEvents: Record<string, {
    // State at this point
    state: SpecState<Spec>;
    // The input text is entering
    input: Input;
    // The connected var supplying input
    connectedVariableName: string | null;
    // Can be multiple positions if fields above are the same in multiple specs
    positions: { specIndex: number; eventIndex: number }[];
  }[]>;

  // Key is component list name
  componentListEvents: Record<string, {
    // State at this point
    state: SpecState<Spec>;
    // Actions following click
    // An error is thrown if button and state are the same but actions different
    actions: SpecEventAction[];
    // Can be multiple positions if fields above are the same in multiple specs
    positions: { specIndex: number; eventIndex: number }[];
  }[]>; // TODO: and input list

  // Key is variable list name
  variableListBehaviour: Record<string, ListBehaviours>;
}

export function processSpec<Spec extends SpecBase>(
  getSpec: (newSpec: NewSpec) => Spec
): { spec: Spec; events: Events; initSpecState: SpecState<Spec> } {

  const events: Events = [];

  const doEffect = (index: number) => (effect: Effect) => {
    events[index].push({ type: "doEffect", effect });
  }

  const enterText = (index: number) => (text: TextVar, example: string) => {
    events[index].push({ type: "enterText", text, example });
  }

  const clickOn = (index: number) => (component: Component) => {
    events[index].push({ type: "clickOn", component });
  }

  const clickOnIndex = (eventIndex: number) => (componentList: ComponentList<Component, Variable>, componentIndex: number) => {
    events[eventIndex].push({ type: "clickOnList", component: componentList, index: componentIndex });
  }

  const equals = (index: number) => <V extends Variable>(variable: V, value: VariableComparitor<V>) => {
    events[index].push({ type: "equals", variable, value });
  }

  const specDescriptions: string[] = [];

  const newSpec: NewSpec = (description, specFn) => {
    const index = events.length;
    events.push([])
    specDescriptions.push(description);
    specFn({
      doEffect: doEffect(index),
      enterText: enterText(index),
      clickOn: clickOn(index),
      clickOnIndex: clickOnIndex(index),
      equals: equals(index)
    });
  }

  const spec = getSpec(newSpec);

  return {
    spec,
    initSpecState: getInitSpecState(spec),
    events
  }
}


export function getComponentHandlers<Spec extends SpecBase>(
  spec: Spec,
  events: Events,
  updateSpecState: (update: (specState: SpecState<Spec>) => SpecState<Spec>) => void,
): SpecComponentHandlers<Spec> {

  const specs = Object.entries(spec).map(([fieldName, fieldValue]) => ({fieldName, fieldValue}));

  const components: { name: string; component: Component }[] =
    specs
      .filter(({fieldValue}) => isComponent(fieldValue))
      .map(({fieldName, fieldValue}) => ({name: fieldName, component: fieldValue as Component}))
  const variables: { name: string; variable: Variable }[] =
    specs
      .filter(({fieldValue}) => isVariable(fieldValue))
      .map(({fieldName, fieldValue}) => ({name: fieldName, variable: fieldValue as Variable}))

  const eventsModel = getEventsModel(events, spec, components, variables);

  const buttons: SpecComponentHandlers<Spec>["buttons"] = {};
  const inputs: SpecComponentHandlers<Spec>["inputs"] = {};
  const lists: SpecComponentHandlers<Spec>["lists"] = {};

  components.forEach(({ name, component }) => {
    if (component.type === "button") {
      buttons[name] = (appState) => ({
        onClick: () => {
          // Get button's potential events
          const relevantEvents = eventsModel.buttonEvents[name];

          // Then the one closest to current state
          const bestEvent = getRelevantEvent(relevantEvents, appState);

          if (bestEvent === null) {
            return;
          }

          // Then run that event's actions
          const nextAppState = bestEvent.actions.reduce((currState, action) => {
              if (action.type === "equals" && action.variable.type === "variableList") {
                const behaviour = eventsModel.variableListBehaviour[getVariableName(variables, action.variable)];

                // These are the final behaviours
                const addBehaviour = [...behaviour.add][0];
                const removeBehaviour = [...behaviour.remove][0];

                return handleAction(action, currState, variables, null, {}, { add: addBehaviour, remove: removeBehaviour }).specState
              }
              return handleAction(action, currState, variables, null, {}).specState
            },
            appState
          )

          // Then update with resulting event's state changes
          updateSpecState(() => nextAppState);
        },
      });
    } else if (component.type === "input") {
      inputs[name] = (appState) => {
        // Get input's potential enterText events
        const relevantEvents = eventsModel.inputEvents[name];

        // Then the one closest to current state
        const bestEvent = getRelevantEvent(relevantEvents, appState);

        if (bestEvent === null) {
          return {
            connectedVariableName: null,
            onChange: () => undefined,
          };
        }

        const { connectedVariableName } = bestEvent;

        return {
          connectedVariableName,
          onChange: (value) => {
            if (connectedVariableName === null) return;
            updateSpecState(s => ({ ...s, state: { ...s.state, [connectedVariableName]: value } }))
          },
        }
      }
    } else if (component.type === "componentList") {
      const connectedVariableName = getVariableName(variables, component.connectedVariable);

      lists[name] = (appState) => {
        const componentType = component.component.type;

        // TODO: get relevant events with appState


        if (componentType === "input") {
          // TODO
          return {
            connectedVariableName,
            onChange: (val, index) => null
          }
        }
        if (componentType === "button") {
          return {
            onClick: (index) => {
              // Repeat of button
              const relevantEvents = eventsModel.componentListEvents[name];

              const behaviour = eventsModel.variableListBehaviour[connectedVariableName];

              // These are the final behaviours
              const addBehaviour = [...behaviour.add][0];
              const removeBehaviour = [...behaviour.remove][0];

              const bestEvent = getRelevantEvent(relevantEvents, appState);

              if (bestEvent === null) {
                return;
              }

              const nextAppState = bestEvent.actions.reduce((currState, action) =>
                handleAction(action, currState, variables, null, { index }, { add: addBehaviour, remove: removeBehaviour }).specState,
                appState
              )

              // Then update with resulting event's state changes
              updateSpecState(() => nextAppState);
            }
          }
        }

        throw Error(`Invalid component type ${componentType}`)
      }
    }
  });

  return {
    buttons,
    inputs,
    lists,
  }
}

function getRelevantEvent<Spec extends SpecBase, T extends {
  state: SpecState<Spec>;
  positions: { specIndex: number; eventIndex: number }[]
}>(relevantEvents: T[], appState: SpecState<Spec>): T | null {

  // Nothing similar in spec
  if (!relevantEvents || relevantEvents.length === 0) {
    return null;
  }

  // Find the best match
  const bestEvents = relevantEvents
    .map((event) => ({ event, score: getSimilarityScore(event.state, appState) }))
    .sort((a, b) => b.score - a.score);

  // Warn on events sharing the same similarity score
  const bestEvent = bestEvents[0];
  const secondBestEvent = bestEvents[1];
  if (bestEvent.score === secondBestEvent?.score) {
    const pos1 = bestEvent.event.positions[0];
    const pos2 = secondBestEvent.event.positions[0];
    console.warn(`Couldn't pick between similarity score of events at ${pos1.specIndex}:${pos1.eventIndex} and ${pos2.specIndex}:${pos2.eventIndex}, so going with the first one.`);
  }

  return bestEvent.event;
}

function getEventsModel<Spec extends SpecBase>(
  events: Events,
  spec: Spec,
  components: { name: string; component: Component }[],
  variables: { name: string; variable: Variable }[]
): EventsModel<Spec> {
  const buttonEvents: EventsModel<Spec>["buttonEvents"] = {};
  const inputEvents: EventsModel<Spec>["inputEvents"] = {};
  const componentListEvents: EventsModel<Spec>["componentListEvents"] = {};
  const variableListBehaviour: EventsModel<Spec>["variableListBehaviour"] = {};

  events.forEach((specEvents, specIndex) => {

    specEvents.reduce(({specState: prevSpecState, listContext: prevListContext}, event, eventIndex) => {
        const {specState, listContext, replacedEvent } = updateStateAndUpdateModel(
          event,
          eventIndex,
          specIndex,
          prevSpecState,
          specEvents,
          buttonEvents,
          inputEvents,
          componentListEvents,
          variableListBehaviour,
          components,
          variables,
          prevListContext
        )
        if (replacedEvent && event.type === "equals" && replacedEvent.type === "equals") {
          // We're going to brutally mutate this. Clean up later! (TODO)
          event.behaviour = replacedEvent.behaviour;
        }
        return { specState, listContext }
      },
      { specState: getInitSpecState(spec), listContext: null as ListContext }
    );
  });

  Object.entries(variableListBehaviour).forEach(([name, behaviour]) => {
    if (behaviour.add.size !== 1) {
      const options = [...behaviour.add].join(" or ");
      console.warn(`Couldn't determine exact add to array behaviour for ${name} (could be both ${options}), try adding more tests cases to clarify.`);
    } else if (behaviour.remove.size !== 1) {
      const options = [...behaviour.remove].join(" or ");
      console.warn(`Couldn't determine exact remove from array behaviour for ${name} (could be both ${options}), try adding more tests cases to clarify.`);
    }
  });

  return {
    buttonEvents,
    inputEvents,
    componentListEvents,
    variableListBehaviour
  }
}

type ListContext = null | { variable: VariableList<Variable>; index: number };

/**
 * Get next state from event. Mutates buttonEvents as it parses events.
 */
function updateStateAndUpdateModel<Spec extends SpecBase>(
  event: SpecEvent,
  eventIndex: number,
  specIndex: number,
  specState: SpecState<Spec>,
  specEvents: SpecEvent[],
  buttonEvents: EventsModel<Spec>["buttonEvents"],
  inputEvents: EventsModel<Spec>["inputEvents"],
  componentListEvents: EventsModel<Spec>["componentListEvents"],
  variableListBehaviour: EventsModel<Spec>["variableListBehaviour"],
  components: { name: string; component: Component }[],
  variables: { name: string; variable: Variable }[],
  listContext: ListContext
): { specState: SpecState<Spec>; listContext: ListContext; replacedEvent?: SpecEvent  } {
  switch (event.type) {
    case "clickOn":
      switch (event.component.type) {
        case "button":
          // We need to add this event to buttonEvents

          const actions = getNextActions(specEvents, eventIndex);

          const buttonName = getComponentName(components, event.component);
          const existingButtonEvents = buttonEvents[buttonName];

          if (!existingButtonEvents) {
            // First event state for this button
            buttonEvents[buttonName] = [
              {
                state: specState,
                button: event.component,
                actions,
                positions: [{ specIndex, eventIndex }]
              }
            ];
          } else {
            const existing = existingButtonEvents.find(
              buttonEvent => statesEqual(buttonEvent.state, specState) || actionsEqual(buttonEvent.actions, actions, variables, specState, true)
            );

            if (!existing) {
              // Not first event state for this button, but unique state and not equals actions
              existingButtonEvents.push({
                state: specState,
                button: event.component,
                actions,
                positions: [{ specIndex, eventIndex }]
              })
            } else if (actionsEqual(existing.actions, actions, variables, specState, false)) {
              // Actions are equivalent, so just add it to positions
              existing.positions.push({ specIndex, eventIndex });
            } else {
              const conflictPos = existing.positions[0];
              throw Error(
                `Conflicting actions for the same state for button ${buttonName} in specs ${conflictPos.specIndex}:${conflictPos.eventIndex} and ${specIndex}:${eventIndex}`
              )
            }

          }

          // Also update the focus
          return {
            specState: {
              ...specState,
              focus: event.component
            },
            listContext: null
          }


        case "input":
          // Only update focus
          return {
            specState: {
              ...specState,
              focus: event.component
            },
            listContext: null
          }


        case "componentList":
          // No-op
          return { specState, listContext };
      }

    case "clickOnList":
      switch (event.component.component.type) {
        case "button":
          // We need to add this event to buttonEvents

          const actions = getNextActions(specEvents, eventIndex);

          const listName = getComponentName(components, event.component);
          const existingListEvents = componentListEvents[listName];

          if (!existingListEvents) {
            // First event state for this list
            componentListEvents[listName] = [
              {
                state: specState,
                actions,
                positions: [{ specIndex, eventIndex }]
              }
            ]
          } else {
            const existing = existingListEvents.find(
              listEvent => statesEqual(listEvent.state, specState) || actionsEqual(listEvent.actions, actions, variables, specState, true)
            );

            if (!existing) {
              // Not first event state for this button, but unique state
              existingListEvents.push({
                state: specState,
                actions,
                positions: [{ specIndex, eventIndex }]
              })
            } else if (actionsEqual(existing.actions, actions, variables, specState, false)) {
              // Actions are equivalent, so just add it to positions
              existing.positions.push({ specIndex, eventIndex });
            } else {
              const conflictPos = existing.positions[0];
              throw Error(
                `Conflicting actions for the same state for component list ${listName} in specs ${conflictPos.specIndex}:${conflictPos.eventIndex} and ${specIndex}:${eventIndex}`
              )
            }

          }

          // Also update the focus
          return {
            specState: {
              ...specState,
              focus: event.component
            },
            listContext: { index: event.index, variable: event.component.connectedVariable }
          }


        case "input":
          // TODO
          return {
            specState: {
              ...specState,
              focus: event.component
            },
            listContext
          }
        }

    case "doEffect":
      // State doesn't change. We don't to run side effects yet.
      return { specState, listContext };

    case "equals":
      const contextIndex = listContext && listContext.variable === event.variable ? listContext.index : undefined
      const { specState: newState, listBehaviours } = handleAction(event, specState, variables, { specIndex, eventIndex }, { index: contextIndex })

      if (listBehaviours) {
        const { name } = listBehaviours;

        if (!variableListBehaviour[name]) {
          variableListBehaviour[name] = { add: new Set(), remove: new Set() };
        }

        if (listBehaviours.type === "add") {
          const addBehaviours = compareBehaviours(
            variableListBehaviour[name].add,
            listBehaviours.behaviours,
            name
          );
          variableListBehaviour[name].add = addBehaviours;

          return { specState: newState, listContext, replacedEvent: {
            ...event,
            behaviour: {
              type: "shouldAdd",
              listEqualsVar: listBehaviours.listEqualsVar
            }
          } };

        } else if (listBehaviours.type === "remove") {
          const removeBehaviours = compareBehaviours(
            variableListBehaviour[name].remove,
            listBehaviours.behaviours,
            name
          );
          variableListBehaviour[name].remove = removeBehaviours;

          return { specState: newState, listContext, replacedEvent: {
            ...event,
            behaviour: {
              type: "shouldRemove",
            }
          } };
        }
      }

      return { specState: newState, listContext };

    case "enterText":
      const focussedComponent = specState.focus;

      if (focussedComponent === null || focussedComponent.type !== "input") {
        return { specState, listContext };
      }

      // We need to add this event to inputEvents

      const inputName = getComponentName(components, focussedComponent);
      const connectedVariableName = getVariableName(variables, event.text);

      const existingInputEvents = inputEvents[inputName];

      if (!existingInputEvents) {
        // First event state for this input
        inputEvents[inputName] = [
          {
            state: specState,
            input: focussedComponent,
            connectedVariableName,
            positions: [{ specIndex, eventIndex }]
          }
        ];
      } else {
        const existing = existingInputEvents.find(
          inputEvent => statesEqual(inputEvent.state, specState) || inputEvent.connectedVariableName === connectedVariableName
        );

        if (!existing) {
          // Not first event state for this input, but unique state
          existingInputEvents.push({
            state: specState,
            input: focussedComponent,
            connectedVariableName,
            positions: [{ specIndex, eventIndex }]
          })
        } else if (existing.connectedVariableName === connectedVariableName) {
          // Events are equivalent, so just add to positions
          existing.positions.push({ specIndex, eventIndex });
        } else {
          const conflictPos = existing.positions[0];
          throw Error(
            `Conflicting linked variables ${existing.connectedVariableName} and ${connectedVariableName} for the same state for input ${inputName} in specs ${conflictPos.specIndex}:${conflictPos.eventIndex} and ${specIndex}:${eventIndex}`
          )
        }

      }

      // Entering text to input with connected var is equivalent to setting var with equals
      return {
        specState: handleAction({ type: "equals", variable: event.text, value: event.example }, specState, variables, { specIndex, eventIndex }, {}).specState,
        listContext,
      }
  }
}

type ListBehaviourAddResult = { type: "add"; behaviours: Set<ListAddBehaviour>; name: string; listEqualsVar: VariableComparitor<Variable> };
type ListBehaviourRemoveResult = { type: "remove"; behaviours: Set<ListRemoveBehaviour>; name: string; index?: number };

/**
 * Returns next state based on action. May produce side effects from actions.
 */
function handleAction<Spec extends SpecBase>(
  action: SpecEventAction,
  specState: SpecState<Spec>,
  variables: { name: string; variable: Variable }[],
  // Only for running through specs
  position: null | { specIndex: number; eventIndex: number },
  eventContext: EventContext,
  listBehaviour?: { add: ListAddBehaviour; remove: ListRemoveBehaviour }
): { specState: SpecState<Spec>; listBehaviours?: ListBehaviourAddResult | ListBehaviourRemoveResult } {
  const posString = position ? ` at ${position.specIndex}:${position.eventIndex}` : "";

  switch (action.type) {
    case "doEffect":
      function getVal<V extends Variable>(variable: V) {
        const variableName = getVariableName(variables, variable);
        return specState.state[variableName] as unknown as VariableValue<typeof variable>;
      }
      action.effect.fn(getVal, eventContext);
      return { specState };

    case "equals": {
      const { variable, value } = action;
      const variableName = getVariableName(variables, variable);

      if (action.behaviour && listBehaviour) {

        // This is a component handler, so use list behaviour to determine change of state

        const prevValue = specState.state[variableName] as string[];

        if (action.behaviour.type === "shouldAdd") {
          const behaviour = listBehaviour.add;
          const { listEqualsVar } = action.behaviour;
          const listEqualsVal = getValueFromState(listEqualsVar, variables, specState) as string[];

          let newArray: string[] = [];

          if (behaviour === "addToEnd") {
            newArray = [...prevValue, listEqualsVal[listEqualsVal.length - 1]];
          } else if (behaviour === "addToStart") {
            newArray = [listEqualsVal[0], ...prevValue];
          } else {
            // overwrite
            newArray = listEqualsVal;
          }

          return {
            specState: {
              ...specState,
              state: {
                ...specState.state,
                [variableName]: newArray,
              }
            },
          }
        } else if (action.behaviour.type === "shouldRemove") {
          const behaviour = listBehaviour.remove;
          const { index } = eventContext;

          const newArray =
            behaviour === "removeAll" ? [] :
            behaviour === "removeFromEnd" ? prevValue.slice(0, prevValue.length - 1) :
            behaviour === "removeFromStart" ? prevValue.slice(1) :
            behaviour === "removeFromIndex" && index !== undefined ? [
              ...prevValue.slice(0, index),
              ...prevValue.slice(index + 1)
            ] : []

          return {
            specState: {
              ...specState,
              state: {
                ...specState.state,
                [variableName]: newArray,
              }
            },
          }
        }
        return { specState }

      }

      const newValue = getValueFromState(value, variables, specState);

      const behaviours: ListBehaviours = {
        add: new Set(),
        remove: new Set()
      }

      const index = eventContext.index;

      if (variable.type === "variableList") {
        const prevValue = specState.state[variableName];

        if (!Array.isArray(newValue) || !Array.isArray(prevValue)) {
          throw Error(`Can only set a variable list to an array${posString}`);
        }

        // Add to list behaviours

        const newValueStart = newValue[0];
        const newValueEnd = newValue[newValue.length - 1];
        const prevValueStart = prevValue[0];
        const prevValueEnd = prevValue[prevValue.length - 1];

        if (newValue.length === 0) {
          // Set empty array

          if (prevValue.length > 1) {
            // Length 2 or more -> 0 must mean remove all
            behaviours.remove.add("removeAll");
          } else {
            // Length 1 -> 0 could have removed from anywhere
            behaviours.remove.add("removeAll");
            behaviours.remove.add("removeFromEnd");
            behaviours.remove.add("removeFromIndex");
            behaviours.remove.add("removeFromStart");
          }
        } else if (newValue.length === prevValue.length) {
          // Arrays are the same length so just overwrite
          behaviours.add.add("overwrite");

        } else if (newValue.length === prevValue.length + 1) {
          // We added to array

          if (prevValue.length === 0) {
            // Previous array was empty so could have added anywhere
            behaviours.add.add("addToEnd");
            behaviours.add.add("addToStart");

          } else if (newValueStart === prevValueStart) {
            // Both arrays start the same, so was added at the end
            behaviours.add.add("addToEnd");

          } else if (newValueEnd === prevValueEnd) {
            // New value added at the beginning since end values the same
            behaviours.add.add("addToStart");
          }
        } else if (newValue.length === prevValue.length - 1) {
          // We removed from array

          if (index !== undefined) {
            // We have some information on index
            if (newValueStart === prevValueStart && newValueEnd === prevValueEnd) {
              // Arrays start and end the same, so was probably removed from index
              behaviours.remove.add("removeFromIndex");

            } else if (newValueStart !== prevValueStart) {
              // Both arrays start different, could be removed there or index
              behaviours.remove.add("removeFromIndex");
              behaviours.remove.add("removeFromStart");

            } else if (newValueEnd !== prevValueEnd) {
              // Both arrays end different, could be removed there or index
              behaviours.remove.add("removeFromIndex");
              behaviours.remove.add("removeFromEnd");
            }
          } else {
            if (newValueStart === prevValueStart && newValueEnd === prevValueEnd) {
              // Arrays start and end the same with no index context, so error
              throw Error(`Must remove array list at beginning or end without list context${posString}`);

            } else if (newValueStart === prevValueStart) {
              // Both arrays start the same, so was removed from the end
              behaviours.remove.add("removeFromEnd");

            } else if (newValueEnd === prevValueEnd) {
              // Both arrays end the same, so was removed from the start
              behaviours.remove.add("removeFromStart");
            }
          }
        } else {
          throw Error(`Invalid array operation${posString}. You can only add one element at the beginning or end of array, and can only remove one element from beginning, end or list index of array`);
        }

        return {
          specState: {
            ...specState,
            state: {
              ...specState.state,
              [variableName]: newValue,
            }
          },
          listBehaviours: behaviours.add.size > 0 ? {
            type: "add",
            behaviours: behaviours.add,
            name: variableName,
            listEqualsVar: value
          } : behaviours.remove.size > 0 ? {
            type: "remove",
            behaviours: behaviours.remove,
            name: variableName,
            index
          } : undefined
        }
      }

      return {
        specState: {
          ...specState,
          state: {
            ...specState.state,
            [variableName]: newValue,
          }
        },
      }
    }
  }
}

