
export type Variable = TextVar | VariableList<Variable>;
export interface VariableList<V extends Variable> { type: "variableList"; variable: V };
export type TextVar = { type: "text" };

export const newText = (): TextVar => ({ type: "text" });
export const newVarList = <V extends Variable>(variable: V): VariableList<V> => ({ type: "variableList", variable });

export type VariableComparitor<V extends Variable> =
  V extends TextVar ? (string | TextVar) :
  V extends VariableList<infer InnerVar> ? VariableComparitor<InnerVar>[] :
  never;

export type VariableValue<V extends Variable> =
  V extends TextVar ? string :
  V extends VariableList<infer InnerVar> ? VariableValue<InnerVar>[] :
  never;

export function isVariable(specField: { type: string }): specField is Variable {
  return specField.type === "text" || specField.type === "variableList";
}

export function getInitValue(variable: Variable): VariableValue<Variable> {
  switch (variable.type) {
    case "text":
      return "";

    case "variableList":
      return [];
  }
}

export function getVariableName(variables: { name: string; variable: Variable }[], origVariable: Variable): string {
  const variableInfo = variables.find(({variable}) => variable === origVariable);

  if (!variableInfo) {
    throw Error(`Unknown variable of type ${origVariable.type}. Did you forget to return one in your spec?`)
  }

  return variableInfo.name
}
