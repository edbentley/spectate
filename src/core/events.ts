import { Component, ComponentList } from "./components";
import {
  Effect,
  EffectResult,
  EffectResultState,
  EffectVal,
  ResolvedEffectVal,
} from "./effects";
import { SpecBase } from "./spec";
import { getValueFromState, SpecState, stateFieldsSimilar } from "./state";
import { Variable, VariableComparitor } from "./variables";

export type Events = SpecEvent[][];
export type SpecEvent =
  | SpecEventUserInput
  | SpecEventAction
  | SpecEventClick
  | SpecEventPage;
type SpecEventClick =
  | { type: "clickOn"; component: Component }
  | {
      type: "clickOnList";
      component: ComponentList<Component, Variable>;
      index: number;
    };
type SpecEventUserInput = {
  type: "enterText";
  example: string;
};
type SpecEventPage = {
  type: "pageLoad";
};
export type SpecEventAction =
  | { type: "doEffect"; effect: Effect<EffectVal> }
  | GetEffectAction
  | {
      type: "equals";
      variable: Variable;
      value: VariableComparitor<Variable> | EffectResult<EffectVal>;
      behaviour?:
        | {
            type: "shouldAdd";
            listEqualsVar:
              | VariableComparitor<Variable>
              | EffectResult<EffectVal>;
          }
        | { type: "doNothing" }
        | { type: "shouldRemove" };
    };

type GetEffectAction = {
  type: "getEffect";
  result: EffectResult<EffectVal>;
  // Options are populated in model
  options: {
    // Result state for relevant effect at this point
    resultVal: ResolvedEffectVal;
    actions: SpecEventAction[];
    position: EventPosition;
  }[];
};

export type EventContext = { index?: number };

export function actionsEqual<Spec extends SpecBase>(
  actionsA: SpecEventAction[],
  actionsB: SpecEventAction[],
  variables: { name: string; variable: Variable }[],
  specState: SpecState<Spec>,
  resultState: EffectResultState,
  // Whether equals compares similarity or exact values
  strict: boolean
): boolean {
  if (actionsA.length !== actionsB.length) return false;

  // Return false in the loop if they're NOT similar at any point. Otherwise
  // they must be similar.
  for (let i = 0; i < actionsA.length; i++) {
    const actionA = actionsA[i];
    const actionB = actionsB[i];

    if (actionA.type !== actionB.type) {
      return false;
    }

    // Actions will have a different referential equality
    // But the variables and effects will be the same

    if (
      actionA.type === "doEffect" &&
      actionB.type === "doEffect" &&
      actionA.effect !== actionB.effect
    ) {
      return false;
    }

    if (
      actionA.type === "getEffect" &&
      actionB.type === "getEffect" &&
      actionA.result.effect !== actionB.result.effect
    ) {
      return false;
    }

    if (actionA.type === "equals" && actionB.type === "equals") {
      if (
        actionA.variable.type === "variableList" &&
        actionB.variable.type === "variableList" &&
        actionA.behaviour !== undefined &&
        actionB.behaviour !== undefined
      ) {
        // Array operations are equivalent if they have the same behaviour
        if (actionA.behaviour.type !== actionB.behaviour.type) {
          return false;
        }
      } else {
        if (actionA.variable !== actionB.variable) {
          return false;
        }

        if (strict) {
          if (actionA.value !== actionB.value) {
            return false;
          }
        } else {
          // Check if value is the same (i.e. similarity score of 1).

          const actionAValue = getValueFromState(
            actionA.value,
            variables,
            specState,
            resultState
          );
          const actionBValue = getValueFromState(
            actionB.value,
            variables,
            specState,
            resultState
          );

          if (!stateFieldsSimilar(actionAValue, actionBValue)) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

/**
 * Collect next set of actions, until the next type of event
 */
export function getNextActions(
  specEvents: SpecEvent[],
  specIndex: number,
  eventIndex: number,
  specDescriptions: string[]
): SpecEventAction[] {
  // We're the last event
  if (eventIndex === specEvents.length - 1) return [];

  // Get index of first element not an action, or getEffect which will branch
  let nextNotActionEventIndex = specEvents
    .slice(eventIndex + 1)
    .findIndex((event) => !isAction(event) || event.type === "getEffect");

  // All proceeding events are actions
  if (nextNotActionEventIndex === -1) {
    nextNotActionEventIndex = specEvents.length;
  }

  const nextActions = specEvents.slice(
    eventIndex + 1,
    // Note: End index is exclusive
    eventIndex + 1 + nextNotActionEventIndex
  ) as SpecEventAction[];

  const additionalActions: SpecEventAction[] = [];

  const lastEventIndex = eventIndex + 1 + nextNotActionEventIndex;
  const lastEvent = specEvents[lastEventIndex];
  if (lastEvent?.type === "getEffect") {
    // Include the getEffect we ended with and its following actions
    const nestedNextActions = getNextActions(
      specEvents,
      specIndex,
      lastEventIndex,
      specDescriptions
    );

    // We currently don't handle nested getEffects so throw an error instead of
    // undefined behaviour
    const nestedGetEffectIndex = nestedNextActions.findIndex(
      (action) => action.type === "getEffect"
    );
    if (nestedGetEffectIndex !== -1) {
      const posStr = formatEventPosition(
        {
          specIndex,
          eventIndex: nestedGetEffectIndex + lastEventIndex + eventIndex + 1,
          eventType: "getEffect",
        },
        specDescriptions
      );
      throw Error(`Can't put two "getEffect" events together in ${posStr}`);
    }

    additionalActions.push({
      ...lastEvent,
      options: [
        {
          resultVal: lastEvent.result.example,
          actions: nestedNextActions,
          position: {
            specIndex,
            eventType: "getEffect",
            eventIndex: lastEventIndex,
          },
        },
      ],
    });
  }

  return [...nextActions, ...additionalActions];
}

export function isAction(specEvent: SpecEvent): specEvent is SpecEventAction {
  return (
    specEvent.type === "equals" ||
    specEvent.type === "doEffect" ||
    specEvent.type === "getEffect"
  );
}

export function formatEventPosition(
  eventPosition: EventPosition,
  specDescriptions: string[]
) {
  return `

Spec name: "${specDescriptions[eventPosition.specIndex]}"
Event number: ${eventPosition.eventIndex} (${eventPosition.eventType})

`;
}

export type EventPosition = {
  specIndex: number;
  eventIndex: number;
  eventType: SpecEvent["type"];
};

/**
 * Chooses the getEffect branch based on the result
 */
export function getEffectActions(
  action: GetEffectAction,
  result: ResolvedEffectVal
) {
  const chosenBranch = action.options.find(
    (option) =>
      option.resultVal !== undefined &&
      result !== undefined &&
      stateFieldsSimilar(option.resultVal, result)
  );

  if (!chosenBranch) {
    console.warn(`Could not find actions based on effect result`);
    return [];
  }

  return chosenBranch.actions;
}
