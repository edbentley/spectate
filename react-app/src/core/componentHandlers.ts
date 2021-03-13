import { Component, isComponent } from "./components";
import { SpecBase } from "./spec";
import { SpecState, getSimilarityScore } from "./state";
import { Events } from "./events";
import { getVariableName, isVariable, Variable } from "./variables";
import { getEventsModel } from "./model";
import { handleActionRunningApp } from "./handleAction";

export interface SpecComponentHandlers<Spec extends SpecBase> {
  // Record of key: button name, val: onClick function determined using similarity scores
  buttons: Record<
    string,
    (appState: SpecState<Spec>) => { onClick: () => void }
  >;

  // Record of key: input name, val: onChange function determined using similarity scores
  inputs: Record<
    string,
    (
      appState: SpecState<Spec>
    ) => {
      connectedVariableName: null | string;
      onChange: (value: string) => void;
    }
  >;

  // Record of key: list name, val: button or input fields with index passed in
  lists: Record<
    string,
    (
      appState: SpecState<Spec>
    ) =>
      | { onClick: (index: number) => void }
      | {
          connectedVariableName: string;
          onChange: (value: string, index: number) => void;
        }
  >;
}

/**
 * Based on a spec and its parsed events, get the handlers for components (like
 * onClick) when they're interacted with.
 */
export function getComponentHandlers<Spec extends SpecBase>(
  spec: Spec,
  events: Events,
  updateSpecState: (
    update: (specState: SpecState<Spec>) => SpecState<Spec>
  ) => void
): SpecComponentHandlers<Spec> {
  const specs = Object.entries(spec).map(([fieldName, fieldValue]) => ({
    fieldName,
    fieldValue,
  }));

  const components: {
    name: string;
    component: Component;
  }[] = specs
    .filter(({ fieldValue }) => isComponent(fieldValue))
    .map(({ fieldName, fieldValue }) => ({
      name: fieldName,
      component: fieldValue as Component,
    }));
  const variables: {
    name: string;
    variable: Variable;
  }[] = specs
    .filter(({ fieldValue }) => isVariable(fieldValue))
    .map(({ fieldName, fieldValue }) => ({
      name: fieldName,
      variable: fieldValue as Variable,
    }));

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
            if (
              action.type === "equals" &&
              action.variable.type === "variableList"
            ) {
              const behaviour =
                eventsModel.variableListBehaviour[
                  getVariableName(variables, action.variable)
                ];

              // These are the final behaviours
              const addBehaviour = [...behaviour.add][0];
              const removeBehaviour = [...behaviour.remove][0];

              return handleActionRunningApp(
                action,
                currState,
                variables,
                {},
                { add: addBehaviour, remove: removeBehaviour }
              );
            }
            return handleActionRunningApp(action, currState, variables, {});
          }, appState);

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
            updateSpecState((s) => ({
              ...s,
              state: { ...s.state, [connectedVariableName]: value },
            }));
          },
        };
      };
    } else if (component.type === "componentList") {
      const connectedVariableName = getVariableName(
        variables,
        component.connectedVariable
      );

      lists[name] = (appState) => {
        const componentType = component.component.type;

        if (componentType === "input") {
          // TODO
          return {
            connectedVariableName,
            onChange: (val, index) => null,
          };
        }
        if (componentType === "button") {
          return {
            onClick: (index) => {
              // Repeat of button
              const relevantEvents = eventsModel.componentListEvents[name];

              const behaviour =
                eventsModel.variableListBehaviour[connectedVariableName];

              // These are the final behaviours
              const addBehaviour = [...behaviour.add][0];
              const removeBehaviour = [...behaviour.remove][0];

              const bestEvent = getRelevantEvent(relevantEvents, appState);

              if (bestEvent === null) {
                return;
              }

              const nextAppState = bestEvent.actions.reduce(
                (currState, action) =>
                  handleActionRunningApp(
                    action,
                    currState,
                    variables,
                    { index },
                    { add: addBehaviour, remove: removeBehaviour }
                  ),
                appState
              );

              // Then update with resulting event's state changes
              updateSpecState(() => nextAppState);
            },
          };
        }

        throw Error(`Invalid component type ${componentType}`);
      };
    }
  });

  return {
    buttons,
    inputs,
    lists,
  };
}

function getRelevantEvent<
  Spec extends SpecBase,
  T extends {
    state: SpecState<Spec>;
    positions: { specIndex: number; eventIndex: number }[];
  }
>(relevantEvents: T[], appState: SpecState<Spec>): T | null {
  // Nothing similar in spec
  if (!relevantEvents || relevantEvents.length === 0) {
    return null;
  }

  // Find the best match
  const bestEvents = relevantEvents
    .map((event) => ({
      event,
      score: getSimilarityScore(event.state, appState),
    }))
    .sort((a, b) => b.score - a.score);

  // Warn on events sharing the same similarity score
  const bestEvent = bestEvents[0];
  const secondBestEvent = bestEvents[1];
  if (bestEvent.score === secondBestEvent?.score) {
    const pos1 = bestEvent.event.positions[0];
    const pos2 = secondBestEvent.event.positions[0];
    console.warn(
      `Couldn't pick between similarity score of events at ${pos1.specIndex}:${pos1.eventIndex} and ${pos2.specIndex}:${pos2.eventIndex}, so going with the first one.`
    );
  }

  return bestEvent.event;
}