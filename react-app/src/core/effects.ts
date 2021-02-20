import { Variable, VariableValue } from "./variables";

export type Effect = {
  type: "effect";
  fn: (getVal: <V extends Variable>(variable: V) => VariableValue<V>) => void
};

export const newEffect = (fn: (getVal: <V extends Variable>(variable: V) => VariableValue<V>) => void): Effect => ({ type: "effect", fn });
