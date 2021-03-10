import { Component, ComponentList } from "./components";
import { Effect } from "./effects";
import {
  TextVar,
  Variable,
  VariableComparitor,
  VariableList,
} from "./variables";

export type SpecBase = Record<string, SpecField>;

export type SpecField =
  | Variable
  | Component
  | Effect
  | VariableList<Variable>
  | ComponentList<Component, Variable>;

export type NewSpec = (description: string, spec: SpecFn) => void;

export type SpecFn = (args: {
  // User inputs
  enterText: (text: TextVar, example: string) => void;
  clickOn: (component: Exclude<Component, ComponentList<any, any>>) => void;
  clickOnIndex: (componentList: ComponentList<any, any>, index: number) => void;
  // Actions
  doEffect: (effect: Effect) => void;
  equals: <V extends Variable>(
    variable: V,
    value: VariableComparitor<V>
  ) => void;
}) => void;
