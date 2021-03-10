import { Component } from "./components";
import { SpecBase } from "./spec";
import {
  isVariable,
  Variable,
  getInitValue,
  VariableValue,
  VariableComparitor,
} from "./variables";

export type SpecState<Spec> = {
  state: SpecStateVars<Spec>;
  focus: Component | null;
};

type SpecStateVars<Spec> = {
  [K in keyof Spec]: Spec[K] extends Variable ? VariableValue<Spec[K]> : never;
};

/**
 * Recursively lookup a variable's primitive value within state
 */
export function getValueFromState<Spec extends SpecBase>(
  variable: Variable | VariableComparitor<Variable>,
  variables: { name: string; variable: Variable }[],
  specState: SpecState<Spec>
): string | string[] {
  if (typeof variable === "string") return variable;

  if (Array.isArray(variable)) {
    return variable.map(
      (val) => getValueFromState(val, variables, specState) as string
    );
  }

  const lookupVariable = variables.find((v) => v.variable === variable)!;

  return specState.state[lookupVariable.name] as string;
}

export function getInitSpecState<Spec extends SpecBase>(
  spec: Spec
): SpecState<Spec> {
  const specStateVars: Partial<SpecStateVars<Spec>> = {};

  Object.entries(spec).forEach(([specName, specField]) => {
    // Only state for Variable type
    if (isVariable(specField)) {
      specStateVars[specName as keyof Spec] = getInitValue(
        specField
      ) as SpecStateVars<Spec>[keyof Spec];
    }
  });

  return {
    state: specStateVars as SpecStateVars<Spec>,
    focus: null,
  };
}

export function statesEqual<Spec extends SpecBase>(
  stateA: SpecState<Spec>,
  stateB: SpecState<Spec>
): boolean {
  return (
    getSimilarityScore(stateA, stateB) === Object.keys(stateA.state).length
  );
}

/**
 * Similarity scored based on variable values. If a variable is deemed the same, score + 1.
 */
export function getSimilarityScore<Spec extends SpecBase>(
  stateA: SpecState<Spec>,
  stateB: SpecState<Spec>
): number {
  return Object.entries(stateA.state).reduce(
    (total, [fieldName1, fieldVal1]) => {
      const fieldVal2 = stateB.state[fieldName1];

      if (stateFieldsSimilar(fieldVal1, fieldVal2)) {
        return total + 1;
      }
      return total;
    },
    0
  );
}

type StateField = string | unknown[];

export function stateFieldsSimilar(
  fieldA: StateField,
  fieldB: StateField
): boolean {
  // For text arrays, only consider the array length.
  if (Array.isArray(fieldA) && Array.isArray(fieldB)) {
    return fieldB.length === fieldA.length;
  }

  // For text variables, we consider if string is empty or not.
  if (typeof fieldA === "string" && typeof fieldB === "string") {
    return Boolean(fieldB) === Boolean(fieldA);
  }

  return false;
}
