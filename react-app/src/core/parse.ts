import { Component, ComponentList } from "./components";
import { NewSpec, SpecBase, SpecFn } from "./spec";
import { getInitSpecState, SpecState } from "./state";
import { Events } from "./events";
import { Variable } from "./variables";
import { Effect, EffectResultState } from "./effects";

/**
 * Convert each spec function into an array of Events. Also returns the initial
 * state.
 */
export function parseSpec<Spec extends SpecBase>(
  getSpec: (newSpec: NewSpec) => Spec
): {
  spec: Spec;
  events: Events;
  initSpecState: SpecState<Spec>;
  initEffectResultState: EffectResultState;
  specDescriptions: string[];
} {
  const events: Events = [];

  const doEffect = (index: number) => (effect: Effect<void>) => {
    events[index].push({ type: "doEffect", effect });
  };

  const getEffect = (index: number): Parameters<SpecFn>[0]["getEffect"] => (
    effect,
    example
  ) => {
    const effectResult = {
      type: "effectResult" as const,
      effect,
      example,
    };
    events[index].push({ type: "getEffect", result: effectResult });
    return effectResult;
  };

  const enterText = (index: number) => (example: string) => {
    events[index].push({ type: "enterText", example });
  };

  const clickOn = (index: number) => (component: Component) => {
    events[index].push({ type: "clickOn", component });
  };

  const clickOnIndex = (eventIndex: number) => (
    componentList: ComponentList<Component, Variable>,
    componentIndex: number
  ) => {
    events[eventIndex].push({
      type: "clickOnList",
      component: componentList,
      index: componentIndex,
    });
  };

  const equals = (index: number): Parameters<SpecFn>[0]["equals"] => (
    variable,
    value
  ) => {
    events[index].push({ type: "equals", variable, value });
  };

  const specDescriptions: string[] = [];

  const newSpec: NewSpec = (description, specFn) => {
    const index = events.length;
    events.push([]);
    specDescriptions.push(description);
    specFn({
      doEffect: doEffect(index),
      getEffect: getEffect(index),
      enterText: enterText(index),
      clickOn: clickOn(index),
      clickOnIndex: clickOnIndex(index),
      equals: equals(index),
    });
  };

  const spec = getSpec(newSpec);

  return {
    spec,
    initSpecState: getInitSpecState(spec),
    initEffectResultState: [],
    events,
    specDescriptions,
  };
}
