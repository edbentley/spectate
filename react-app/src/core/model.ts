import { Button, Component, getComponentName, Input } from "./components";
import { SpecBase } from "./spec";
import { getInitSpecState, SpecState, statesEqual } from "./state";
import {
  actionsEqual,
  Events,
  getNextActions,
  SpecEvent,
  SpecEventAction,
} from "./events";
import {
  compareBehaviours,
  getVariableName,
  ListBehaviours,
  Variable,
  VariableList,
} from "./variables";
import { handleActionGeneratingModel } from "./handleAction";

type EventsModel<Spec extends SpecBase> = {
  // Key is component name
  buttonEvents: Record<
    string,
    {
      // State at this point
      state: SpecState<Spec>;
      // The button clicked on
      button: Button;
      // Actions following click
      // An error is thrown if button and state are the same but actions different
      actions: SpecEventAction[];
      // Can be multiple positions if fields above are the same in multiple specs
      positions: { specIndex: number; eventIndex: number }[];
    }[]
  >;

  // Key is component name
  // We only care about enterText here, not clickOn
  inputEvents: Record<
    string,
    {
      // State at this point
      state: SpecState<Spec>;
      // The input text is entering
      input: Input;
      // The connected var supplying input
      connectedVariableName: string | null;
      // Can be multiple positions if fields above are the same in multiple specs
      positions: { specIndex: number; eventIndex: number }[];
    }[]
  >;

  // Key is component list name
  componentListEvents: Record<
    string,
    {
      // State at this point
      state: SpecState<Spec>;
      // Actions following click
      // An error is thrown if button and state are the same but actions different
      actions: SpecEventAction[];
      // Can be multiple positions if fields above are the same in multiple specs
      positions: { specIndex: number; eventIndex: number }[];
    }[]
  >; // TODO: and input list

  // Key is variable list name
  variableListBehaviour: Record<string, ListBehaviours>;
};

export function getEventsModel<Spec extends SpecBase>(
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
    specEvents.reduce(
      (
        { specState: prevSpecState, listContext: prevListContext },
        event,
        eventIndex
      ) => {
        const {
          specState,
          listContext,
          replacedEvent,
        } = updateStateAndUpdateModel(
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
        );
        if (
          replacedEvent &&
          event.type === "equals" &&
          replacedEvent.type === "equals"
        ) {
          // We're going to brutally mutate the event. This is the easiest way
          // to ensure it's updated in the model.
          event.behaviour = replacedEvent.behaviour;
        }
        return { specState, listContext };
      },
      { specState: getInitSpecState(spec), listContext: null as ListContext }
    );
  });

  Object.entries(variableListBehaviour).forEach(([name, behaviour]) => {
    if (behaviour.add.size !== 1) {
      const options = [...behaviour.add].join(" or ");
      console.warn(
        `Couldn't determine exact add to array behaviour for ${name} (could be both ${options}), try adding more tests cases to clarify.`
      );
    } else if (behaviour.remove.size !== 1) {
      const options = [...behaviour.remove].join(" or ");
      console.warn(
        `Couldn't determine exact remove from array behaviour for ${name} (could be both ${options}), try adding more tests cases to clarify.`
      );
    }
  });

  return {
    buttonEvents,
    inputEvents,
    componentListEvents,
    variableListBehaviour,
  };
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
  variableListBehaviour: EventsModel<Spec>["variableListBehaviour"],
  components: { name: string; component: Component }[],
  variables: { name: string; variable: Variable }[],
  listContext: ListContext
): {
  specState: SpecState<Spec>;
  listContext: ListContext;
  replacedEvent?: SpecEvent;
} {
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
                positions: [{ specIndex, eventIndex }],
              },
            ];
          } else {
            const existing = existingButtonEvents.find(
              (buttonEvent) =>
                statesEqual(buttonEvent.state, specState) ||
                actionsEqual(
                  buttonEvent.actions,
                  actions,
                  variables,
                  specState,
                  true
                )
            );

            if (!existing) {
              // Not first event state for this button, but unique state and not equals actions
              existingButtonEvents.push({
                state: specState,
                button: event.component,
                actions,
                positions: [{ specIndex, eventIndex }],
              });
            } else if (
              actionsEqual(
                existing.actions,
                actions,
                variables,
                specState,
                false
              )
            ) {
              // Actions are equivalent, so just add it to positions
              existing.positions.push({ specIndex, eventIndex });
            } else {
              const conflictPos = existing.positions[0];
              throw Error(
                `Conflicting actions for the same state for button ${buttonName} in specs ${conflictPos.specIndex}:${conflictPos.eventIndex} and ${specIndex}:${eventIndex}`
              );
            }
          }

          // Also update the focus
          return {
            specState: {
              ...specState,
              focus: event.component,
            },
            listContext: null,
          };

        case "input":
          // Only update focus
          return {
            specState: {
              ...specState,
              focus: event.component,
            },
            listContext: null,
          };

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
                positions: [{ specIndex, eventIndex }],
              },
            ];
          } else {
            const existing = existingListEvents.find(
              (listEvent) =>
                statesEqual(listEvent.state, specState) ||
                actionsEqual(
                  listEvent.actions,
                  actions,
                  variables,
                  specState,
                  true
                )
            );

            if (!existing) {
              // Not first event state for this button, but unique state
              existingListEvents.push({
                state: specState,
                actions,
                positions: [{ specIndex, eventIndex }],
              });
            } else if (
              actionsEqual(
                existing.actions,
                actions,
                variables,
                specState,
                false
              )
            ) {
              // Actions are equivalent, so just add it to positions
              existing.positions.push({ specIndex, eventIndex });
            } else {
              const conflictPos = existing.positions[0];
              throw Error(
                `Conflicting actions for the same state for component list ${listName} in specs ${conflictPos.specIndex}:${conflictPos.eventIndex} and ${specIndex}:${eventIndex}`
              );
            }
          }

          // Also update the focus
          return {
            specState: {
              ...specState,
              focus: event.component,
            },
            listContext: {
              index: event.index,
              variable: event.component.connectedVariable,
            },
          };

        case "input":
          // TODO
          return {
            specState: {
              ...specState,
              focus: event.component,
            },
            listContext,
          };
      }

    case "doEffect":
      // State doesn't change. We don't want to run side effects yet.
      return { specState, listContext };

    case "equals":
      const contextIndex =
        listContext && listContext.variable === event.variable
          ? listContext.index
          : undefined;
      const {
        specState: newState,
        listBehaviours,
      } = handleActionGeneratingModel(
        event,
        specState,
        variables,
        { specIndex, eventIndex },
        { index: contextIndex }
      );

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

          return {
            specState: newState,
            listContext,
            replacedEvent: {
              ...event,
              behaviour: {
                type: "shouldAdd",
                listEqualsVar: listBehaviours.listEqualsVar,
              },
            },
          };
        } else if (listBehaviours.type === "remove") {
          const removeBehaviours = compareBehaviours(
            variableListBehaviour[name].remove,
            listBehaviours.behaviours,
            name
          );
          variableListBehaviour[name].remove = removeBehaviours;

          return {
            specState: newState,
            listContext,
            replacedEvent: {
              ...event,
              behaviour: {
                type: "shouldRemove",
              },
            },
          };
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
            positions: [{ specIndex, eventIndex }],
          },
        ];
      } else {
        const existing = existingInputEvents.find(
          (inputEvent) =>
            statesEqual(inputEvent.state, specState) ||
            inputEvent.connectedVariableName === connectedVariableName
        );

        if (!existing) {
          // Not first event state for this input, but unique state
          existingInputEvents.push({
            state: specState,
            input: focussedComponent,
            connectedVariableName,
            positions: [{ specIndex, eventIndex }],
          });
        } else if (existing.connectedVariableName === connectedVariableName) {
          // Events are equivalent, so just add to positions
          existing.positions.push({ specIndex, eventIndex });
        } else {
          const conflictPos = existing.positions[0];
          throw Error(
            `Conflicting linked variables ${existing.connectedVariableName} and ${connectedVariableName} for the same state for input ${inputName} in specs ${conflictPos.specIndex}:${conflictPos.eventIndex} and ${specIndex}:${eventIndex}`
          );
        }
      }

      // Entering text to input with connected var is equivalent to setting var with equals
      return {
        specState: handleActionGeneratingModel(
          { type: "equals", variable: event.text, value: event.example },
          specState,
          variables,
          { specIndex, eventIndex },
          {}
        ).specState,
        listContext,
      };
  }
}

type ListContext = null | { variable: VariableList<Variable>; index: number };
