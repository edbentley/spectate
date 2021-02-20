import { Component } from "./components";
import { Effect } from "./effects";
import { SpecBase } from "./spec";
import { getValueFromState, SpecState, stateFieldsSimilar } from "./state";
import { TextVar, Variable, VariableComparitor } from "./variables";

export type Events = SpecEvent[][];
export type SpecEvent = SpecEventUserInput | SpecEventAction | SpecEventClick;
export type SpecEventClick =
  | { type: "clickOn"; component: Component }
export type SpecEventUserInput =
  | { type: "enterText"; text: TextVar; example: string }
export type SpecEventAction =
  | { type: "doEffect"; effect: Effect }
  | { type: "equals"; variable: Variable; value: VariableComparitor<Variable> }


export function actionsEqual<Spec extends SpecBase>(
  actionsA: SpecEventAction[],
  actionsB: SpecEventAction[],
  variables: { name: string; variable: Variable }[],
  specState: SpecState<Spec>
): boolean {
  if (actionsA.length !== actionsB.length) return false;

  for (let i = 0; i < actionsA.length; i++) {
    const actionA = actionsA[i];
    const actionB = actionsB[i];

    if (actionA.type !== actionB.type) {
      return false;
    }

    // Actions will have a different referential equality
    // But the variables and effects will be the same

    if (actionA.type === "doEffect" && actionB.type === "doEffect" && actionA.effect !== actionB.effect) {
      return false;
    }

    if (actionA.type === "equals" && actionB.type === "equals") {
      if (actionA.variable !== actionB.variable) {
        return false;
      }

      // Check if value is the same (i.e. similarity score of 1).

      const actionAValue = getValueFromState(actionA.value, variables, specState);
      const actionBValue = getValueFromState(actionB.value, variables, specState);

      if (!stateFieldsSimilar(actionAValue, actionBValue)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Collect next set of actions, until the next type of event
 */
export function getNextActions(specEvents: SpecEvent[], eventIndex: number): SpecEventAction[] {
  // We're the last event
  if (eventIndex === specEvents.length - 1) return [];

  // Get index of first element not an action
  let nextNotActionEventIndex = specEvents.slice(eventIndex + 1).findIndex(event => !isAction(event));

  // All proceeding events are actions
  if (nextNotActionEventIndex === -1) {
    nextNotActionEventIndex = specEvents.length;
  }

  return specEvents.slice(
    eventIndex + 1,
    // Note: End index is exclusive
    eventIndex + 1 + nextNotActionEventIndex
  ) as SpecEventAction[];
}

export function isAction(specEvent: SpecEvent): specEvent is SpecEventAction {
  return specEvent.type === "equals" || specEvent.type === "doEffect";
}
