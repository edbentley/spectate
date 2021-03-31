import { Component, isComponent } from "./components";
import { SpecBase } from "./spec";
import { SpecState, getSimilarityScore } from "./state";
import {
  EventPosition,
  Events,
  formatEventPosition,
  SpecEvent,
} from "./events";
import { getVariableName, isVariable, Variable } from "./variables";
import { getEventsModel } from "./model";
import { handleActionRunningApp } from "./handleAction";
import { replaceArray } from "./utils";
import { EffectResultState } from "./effects";

export interface SpecComponentHandlers<Spec extends SpecBase> {
  // Actions called on page load
  onPageLoad: (
    appSpecState: SpecState<Spec>,
    appResultState: EffectResultState
  ) => void;

  // Record of key: button name, val: onClick function determined using similarity scores
  buttons: Record<
    string,
    (
      appSpecState: SpecState<Spec>,
      appResultState: EffectResultState
    ) => { onClick: () => void }
  >;

  // Record of key: input name, val: onChange function
  inputs: Record<
    string,
    {
      connectedVariableName: null | string;
      onChange: (value: string) => void;
    }
  >;

  // Record of key: list name, val: button or input fields with index passed in
  lists: Record<
    string,
    (
      appSpecState: SpecState<Spec>,
      appResultState: EffectResultState
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
  ) => void,
  updateResultState: (
    update: (resultState: EffectResultState) => EffectResultState
  ) => void,
  specDescriptions: string[]
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

  const eventsModel = getEventsModel(
    events,
    spec,
    components,
    variables,
    specDescriptions
  );

  const buttons: SpecComponentHandlers<Spec>["buttons"] = {};
  const inputs: SpecComponentHandlers<Spec>["inputs"] = {};
  const lists: SpecComponentHandlers<Spec>["lists"] = {};

  const onPageLoad = (
    appSpecState: SpecState<Spec>,
    appResultState: EffectResultState
  ) => {
    eventsModel.pageLoad.actions.reduce(
      async (prev, action) => {
        const { specState, resultState } = await prev;
        const nextAppState = await handleActionRunningApp(
          action,
          specState,
          resultState,
          variables,
          {}
        );
        // Update with resulting event's state changes after each async step
        updateSpecState(() => nextAppState.specState);
        updateResultState(() => nextAppState.resultState);
        return nextAppState;
      },
      Promise.resolve({
        specState: appSpecState,
        resultState: appResultState,
      })
    );
  };

  components.forEach(({ name, component }) => {
    if (component.type === "button") {
      buttons[name] = (appSpecState, appResultState) => ({
        onClick: async () => {
          // Get button's potential events
          const relevantEvents = eventsModel.buttonEvents[name];

          // Then the one closest to current state
          const bestEvent = getRelevantEvent(
            relevantEvents,
            appSpecState,
            specDescriptions
          );

          if (bestEvent === null) {
            return;
          }

          // Then run that event's actions
          bestEvent.actions.reduce(
            async (prev, action) => {
              const { specState, resultState } = await prev;

              let getAppState;
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

                getAppState = handleActionRunningApp(
                  action,
                  specState,
                  resultState,
                  variables,
                  {},
                  { add: addBehaviour, remove: removeBehaviour }
                );
              } else {
                getAppState = handleActionRunningApp(
                  action,
                  specState,
                  resultState,
                  variables,
                  {}
                );
              }
              const nextAppState = await getAppState;

              // Update with resulting event's state changes after each async step
              updateSpecState(() => nextAppState.specState);
              updateResultState(() => nextAppState.resultState);
              return nextAppState;
            },
            Promise.resolve({
              specState: appSpecState,
              resultState: appResultState,
            })
          );
        },
      });
    } else if (component.type === "input") {
      const connectedVariableName = component.connectedVar
        ? getVariableName(variables, component.connectedVar)
        : null;
      inputs[name] = {
        connectedVariableName,
        onChange: (value) => {
          if (connectedVariableName === null) return;
          updateSpecState((s) => ({
            ...s,
            state: { ...s.state, [connectedVariableName]: value },
          }));
        },
      };
    } else if (component.type === "componentList") {
      const connectedVariableName = getVariableName(
        variables,
        component.connectedVariable
      );

      lists[name] = (appSpecState, appResultState) => {
        const componentType = component.component.type;

        if (componentType === "input") {
          return {
            connectedVariableName,
            onChange: (val, index) => {
              updateSpecState((s) => ({
                ...s,
                state: {
                  ...s.state,
                  [connectedVariableName]: replaceArray<string>(
                    s.state[connectedVariableName] as string[],
                    val,
                    index
                  ),
                },
              }));
            },
          };
        }
        if (componentType === "button") {
          return {
            onClick: async (index) => {
              // Repeat of button
              const relevantEvents = eventsModel.buttonListEvents[name];

              const behaviour =
                eventsModel.variableListBehaviour[connectedVariableName];

              // These are the final behaviours
              const addBehaviour = [...behaviour.add][0];
              const removeBehaviour = [...behaviour.remove][0];

              const bestEvent = getRelevantEvent(
                relevantEvents,
                appSpecState,
                specDescriptions
              );

              if (bestEvent === null) {
                return;
              }

              bestEvent.actions.reduce(
                async (prev, action) => {
                  const { specState, resultState } = await prev;
                  const nextAppState = await handleActionRunningApp(
                    action,
                    specState,
                    resultState,
                    variables,
                    { index },
                    { add: addBehaviour, remove: removeBehaviour }
                  );
                  // Update with resulting event's state changes after each async step
                  updateSpecState(() => nextAppState.specState);
                  updateResultState(() => nextAppState.resultState);
                  return nextAppState;
                },
                Promise.resolve({
                  specState: appSpecState,
                  resultState: appResultState,
                })
              );
            },
          };
        }

        throw Error(`Invalid component type ${componentType}`);
      };
    }
  });

  return {
    onPageLoad,
    buttons,
    inputs,
    lists,
  };
}

function getRelevantEvent<
  Spec extends SpecBase,
  T extends {
    state: SpecState<Spec>;
    positions: EventPosition[];
  }
>(
  relevantEvents: T[],
  appState: SpecState<Spec>,
  specDescriptions: string[]
): T | null {
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

    const posStr1 = formatEventPosition(pos1, specDescriptions);
    const posStr2 = formatEventPosition(pos2, specDescriptions);

    console.warn(
      `Couldn't pick between similarity score of events in ${posStr1} and ${posStr2} so going with the first one.`
    );
  }

  return bestEvent.event;
}
