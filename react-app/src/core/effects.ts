import { EventContext } from "./events";
import { Variable, VariableValue } from "./variables";

export type Effect<Val extends EffectVal> = {
  type: "effect";
  fn: (
    getVal: <V2 extends Variable>(variable: V2) => VariableValue<V2>,
    context: EventContext
  ) => Val;
};

export const newEffect = <Val extends EffectVal>(
  fn: Effect<Val>["fn"]
): Effect<Val> => ({ type: "effect", fn });

export type EffectVal = string | string[] | void;
export type EffectResult<Val extends EffectVal> = {
  type: "effectResult";
  example: Val;
  effect: Effect<Val>;
};

export type EffectResultState = EffectResultStateItem<EffectVal>[];

type EffectResultStateItem<Val extends EffectVal> = {
  effectResult: EffectResult<Val>;
  state: Val;
};
