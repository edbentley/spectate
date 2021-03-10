import { EventContext } from "./events";
import { Variable, VariableValue } from "./variables";

export type Effect = {
  type: "effect";
  fn: (
    getVal: <V extends Variable>(variable: V) => VariableValue<V>,
    context: EventContext
  ) => void;
};

export const newEffect = (fn: Effect["fn"]): Effect => ({ type: "effect", fn });
