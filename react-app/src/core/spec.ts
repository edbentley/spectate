import { Component } from "./components";
import { Effect } from "./effects";
import { TextVar, Variable, VariableComparitor } from "./variables";

export type SpecBase = Record<string, SpecField>;

export type SpecField = Variable | Component | Effect;

export type NewSpec = (description: string, spec: SpecFn) => void;

export type SpecFn = (args: {
  // User inputs
  enterText: (text: TextVar, example: string) => void;
  clickOn: (component: Component) => void;
  // Actions
  doEffect: (effect: Effect) => void;
  equals: <V extends Variable>(variable: V, value: VariableComparitor<V>) => void;
}) => void;
