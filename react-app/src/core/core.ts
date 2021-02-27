import { Button, Component, ComponentList, getComponentName, Input, isComponent } from "./components";
import { NewSpec, SpecBase } from "./spec";
import { getInitSpecState, SpecState, statesEqual, getSimilarityScore, getValueFromState } from "./state";
import { actionsEqual, EventContext, Events, getNextActions, SpecEvent, SpecEventAction } from "./events"
import { getVariableName, isVariable, TextVar, Variable, VariableComparitor, VariableValue } from "./variables";
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

  // Key is list name
  componentListEvents: Record<string, {
    // State at this point
    state: SpecState<Spec>;
    // Actions following click
    // An error is thrown if button and state are the same but actions different
    actions: SpecEventAction[];
    // Can be multiple positions if fields above are the same in multiple specs
    positions: { specIndex: number; eventIndex: number }[];
  }[]>; // TODO: and input list
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
          const nextAppState = bestEvent.actions.reduce((currState, action) =>
            handleAction(action, currState, variables, null, {}),
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
              // State Needed?
              // console.log("Clicked on field", appState.state[connectedVariableName][index])

              // Repeat of button
              const relevantEvents = eventsModel.componentListEvents[name];

              const bestEvent = getRelevantEvent(relevantEvents, appState);

              if (bestEvent === null) {
                return;
              }

              const nextAppState = bestEvent.actions.reduce((currState, action) =>
                handleAction(action, currState, variables, null, { index }),
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
  })

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

  events.forEach((specEvents, specIndex) => {

    specEvents.reduce((specState, event, eventIndex) => updateStateAndUpdateModel(
      event,
      eventIndex,
      specIndex,
      specState,
      specEvents,
      buttonEvents,
      inputEvents,
      componentListEvents,
      components,
      variables,
    ), getInitSpecState(spec));

  })

  return {
    buttonEvents,
    inputEvents,
    componentListEvents
  }
}

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
  components: { name: string; component: Component }[],
  variables: { name: string; variable: Variable }[]
): SpecState<Spec> {
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
            const existing = existingButtonEvents.find(buttonEvent => statesEqual(buttonEvent.state, specState));

            if (!existing) {
              // Not first event state for this button, but unique state
              existingButtonEvents.push({
                state: specState,
                button: event.component,
                actions,
                positions: [{ specIndex, eventIndex }]
              })
            } else if (actionsEqual(existing.actions, actions, variables, specState)) {
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
            ...specState,
            focus: event.component
          }


        case "input":
          // Only update focus
          return {
            ...specState,
            focus: event.component
          }


        case "componentList":
          // No-op
          return specState;
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
            ];
          } else {
            const existing = existingListEvents.find(listEvent => statesEqual(listEvent.state, specState));

            if (!existing) {
              // Not first event state for this button, but unique state
              existingListEvents.push({
                state: specState,
                actions,
                positions: [{ specIndex, eventIndex }]
              })
            } else if (actionsEqual(existing.actions, actions, variables, specState)) {
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
            ...specState,
            focus: event.component
          }


        case "input":
          // TODO
          return {
            ...specState,
            focus: event.component
          }
        }

    case "doEffect":
      // State doesn't change. We don't to run side effects yet.
      return specState;

    case "equals":
      return handleAction(event, specState, variables, { specIndex, eventIndex }, {})

    case "enterText":
      const focussedComponent = specState.focus;

      if (focussedComponent === null || focussedComponent.type !== "input") {
        return specState;
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
        const existing = existingInputEvents.find(inputEvent => statesEqual(inputEvent.state, specState));

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
      return handleAction({ type: "equals", variable: event.text, value: event.example }, specState, variables, { specIndex, eventIndex }, {})
  }
}


/**
 * Returns next state based on action. May produce side effects from actions.
 */
function handleAction<Spec extends SpecBase>(
  action: SpecEventAction,
  specState: SpecState<Spec>,
  variables: { name: string; variable: Variable }[],
  position: null | { specIndex: number; eventIndex: number },
  eventContext: EventContext
): SpecState<Spec> {
  const posString = position ? ` at ${position.specIndex}:${position.eventIndex}` : "";

  switch (action.type) {
    case "doEffect":
      function getVal<V extends Variable>(variable: V) {
        const variableName = getVariableName(variables, variable);
        return specState.state[variableName] as unknown as VariableValue<typeof variable>;
      }
      action.effect.fn(getVal, eventContext);
      return specState;

    case "equals":
      const { variable, value } = action;
      const variableName = getVariableName(variables, variable);
      const newValue = getValueFromState(value, variables, specState);

      if (Array.isArray(newValue)) {
        // Handle arrays (like push), where we need to take into account previous values in array
        const prevValue = specState.state[variableName];

        // TODO: not continually adding to array

        if (newValue.length === 0){
          // We cleared array
          return {
            ...specState,
            state: {
              ...specState.state,
              [variableName]: [],
            }
          }
        }

        if (newValue.length === prevValue.length) {
          // Arrays are the same length so just overwrite
          return {
            ...specState,
            state: {
              ...specState.state,
              [variableName]: newValue,
            }
          }
        }

        if (newValue.length === prevValue.length + 1) {
          // We added to array

          if (prevValue.length === 0) {
            // Previous array was empty so just overwrite
            return {
              ...specState,
              state: {
                ...specState.state,
                [variableName]: newValue,
              }
            }
          }

          if (newValue[0] === prevValue[0]) {
            // Both arrays start the same, so was added at the end
            const lastNewValue = newValue[newValue.length - 1];
            return {
              ...specState,
              state: {
                ...specState.state,
                [variableName]: [...prevValue, lastNewValue],
              }
            }
          }

          if (newValue[newValue.length - 1] === prevValue[prevValue.length - 1]) {
            // New value added at the beginning
            const firstNewValue = newValue[0];
            return {
              ...specState,
              state: {
                ...specState.state,
                [variableName]: [firstNewValue, ...prevValue],
              }
            }
          }
        }

        if (newValue.length < prevValue.length) {

          // If we don't have context about the index, it won't matter since we're only comparing array lengths
          const index = eventContext.index ?? 0;

          if (newValue.length === prevValue.length - 1) {
            return {
              ...specState,
              state: {
                ...specState.state,
                [variableName]: [
                  ...prevValue.slice(0, index),
                  ...prevValue.slice(index + 1)
                ],
              }
            }
          }
          throw Error(`TODO${posString}`)

        }

        throw Error(`Invalid array operation${posString}. You can only add or remove one element from the beginning or end of array`);
      }

      return {
        ...specState,
        state: {
          ...specState.state,
          [variableName]: newValue,
        }
      }
  }
}

