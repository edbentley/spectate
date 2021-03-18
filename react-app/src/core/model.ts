import { Button, Component, getComponentName } from "./components";
import { SpecBase } from "./spec";
import { getInitSpecState, SpecState, statesEqual } from "./state";
import {
  actionsEqual,
  EventPosition,
  Events,
  formatEventPosition,
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
import { replaceArray } from "./utils";

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
      positions: EventPosition[];
    }[]
  >;

  // Key is component list name
  buttonListEvents: Record<
    string,
    {
      // State at this point
      state: SpecState<Spec>;
      // Actions following click
      // An error is thrown if button and state are the same but actions different
      actions: SpecEventAction[];
      // Can be multiple positions if fields above are the same in multiple specs
      positions: EventPosition[];
    }[]
  >;

  // Key is variable list name
  variableListBehaviour: Record<string, ListBehaviours>;
};

export function getEventsModel<Spec extends SpecBase>(
  events: Events,
  spec: Spec,
  components: { name: string; component: Component }[],
  variables: { name: string; variable: Variable }[],
  specDescriptions: string[]
): EventsModel<Spec> {
  const buttonEvents: EventsModel<Spec>["buttonEvents"] = {};
  const buttonListEvents: EventsModel<Spec>["buttonListEvents"] = {};
  const variableListBehaviour: EventsModel<Spec>["variableListBehaviour"] = {};

  events.forEach((specEvents, specIndex) => {
    let currSpecState = getInitSpecState(spec);
    let currListContext = null as ListContext;

    // First pass through events: Add list behaviours first to get more
    // information for events model
    const specEventsWithBehaviour = specEvents.map(
      (event, eventIndex, currSpecEventsWithBehaviour) => {
        const {
          specState,
          listContext,
          replacedEvent,
        } = updateStateAndUpdateModel(
          event,
          eventIndex,
          specIndex,
          currSpecState,
          currSpecEventsWithBehaviour,
          // Use dummy vars for events model since we don't want to add to them
          // for real until we've done the first pass
          {},
          {},
          {},
          components,
          variables,
          currListContext,
          specDescriptions
        );
        currSpecState = specState;
        currListContext = listContext;

        if (
          replacedEvent &&
          event.type === "equals" &&
          replacedEvent.type === "equals"
        ) {
          return {
            ...event,
            behaviour: replacedEvent.behaviour,
          };
        }
        return event;
      }
    );

    // Second pass: add to events models
    specEventsWithBehaviour.reduce(
      (
        { specState: prevSpecState, listContext: prevListContext },
        event,
        eventIndex,
        currSpecEventsWithBehaviour
      ) =>
        updateStateAndUpdateModel(
          event,
          eventIndex,
          specIndex,
          prevSpecState,
          currSpecEventsWithBehaviour,
          buttonEvents,
          buttonListEvents,
          variableListBehaviour,
          components,
          variables,
          prevListContext,
          specDescriptions
        ),
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
    buttonListEvents,
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
  buttonListEvents: EventsModel<Spec>["buttonListEvents"],
  variableListBehaviour: EventsModel<Spec>["variableListBehaviour"],
  components: { name: string; component: Component }[],
  variables: { name: string; variable: Variable }[],
  listContext: ListContext,
  specDescriptions: string[]
): {
  specState: SpecState<Spec>;
  listContext: ListContext;
  replacedEvent?: SpecEvent;
} {
  const position: EventPosition = {
    specIndex,
    eventIndex,
    eventType: event.type,
  };
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
                positions: [position],
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
                positions: [position],
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
              existing.positions.push(position);
            } else {
              const conflictPos = existing.positions[0];
              const conflictPosStr = formatEventPosition(
                conflictPos,
                specDescriptions
              );
              const posStr = formatEventPosition(position, specDescriptions);
              throw Error(
                `Conflicting actions for the same state for button ${buttonName} in ${conflictPosStr} and ${posStr}`
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
          const existingListEvents = buttonListEvents[listName];

          if (!existingListEvents) {
            // First event state for this list
            buttonListEvents[listName] = [
              {
                state: specState,
                actions,
                positions: [position],
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
                positions: [position],
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
              existing.positions.push(position);
            } else {
              const conflictPos = existing.positions[0];
              const conflictPosStr = formatEventPosition(
                conflictPos,
                specDescriptions
              );
              const posStr = formatEventPosition(position, specDescriptions);
              throw Error(
                `Conflicting actions for the same state for component list ${listName} in ${conflictPosStr} and ${posStr}`
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
        position,
        { index: contextIndex },
        specDescriptions
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
            name,
            position,
            specDescriptions
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
            name,
            position,
            specDescriptions
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
        } else if (listBehaviours.type === "doNothing") {
          return {
            specState: newState,
            listContext,
            replacedEvent: {
              ...event,
              behaviour: {
                type: "doNothing",
              },
            },
          };
        }
      }

      return { specState: newState, listContext };

    case "enterText":
      const focussedComponent = specState.focus;

      if (focussedComponent?.type === "input") {
        if (!focussedComponent.connectedVar) {
          const inputName = getComponentName(components, focussedComponent);
          const posStr = formatEventPosition(position, specDescriptions);
          throw Error(
            `Input ${inputName} is missing connected text variable when text is entered in ${posStr}`
          );
        }

        const connectedVarName = getVariableName(
          variables,
          focussedComponent.connectedVar
        );

        // Update state field
        return {
          specState: {
            ...specState,
            state: {
              ...specState.state,
              [connectedVarName]: event.example,
            },
          },
          listContext,
        };
      }

      if (
        focussedComponent?.type === "componentList" &&
        focussedComponent.component.type === "input" &&
        listContext
      ) {
        const connectedVarName = getVariableName(
          variables,
          focussedComponent.connectedVariable
        );

        // Update state array field
        return {
          specState: {
            ...specState,
            state: {
              ...specState.state,
              [connectedVarName]: replaceArray<string>(
                specState.state[connectedVarName] as string[],
                event.example,
                listContext.index
              ),
            },
          },
          listContext,
        };
      }

      return { specState, listContext };
  }
}

type ListContext = null | { variable: VariableList<Variable>; index: number };
