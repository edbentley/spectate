import { Component, ComponentList } from "./components";
import { Effect, EffectResult, EffectVal } from "./effects";
import { Variable, VariableComparitor, VariableList } from "./variables";

export type SpecBase = Record<string, SpecField>;

export type SpecField =
  | Variable
  | Component
  | Effect<EffectVal>
  | VariableList<Variable>
  | ComponentList<Component, Variable>;

export type NewSpec = (description: string, spec: SpecFn) => void;

export type SpecFn = (args: {
  // User inputs
  enterText: (example: string) => void;
  clickOn: (component: Exclude<Component, ComponentList<any, any>>) => void;
  clickOnIndex: (componentList: ComponentList<any, any>, index: number) => void;
  // Actions
  doEffect: (effect: Effect<void>) => void;
  getEffect: <Val extends EffectVal>(
    effect: Effect<Val>,
    example: Val
  ) => EffectResult<Val>;
  equals: <V extends Variable>(
    variable: V,
    value: VariableComparitor<V> | EffectResult<EffectVal>
  ) => void;
}) => void;
