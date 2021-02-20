
export type Variable = TextVar | TextList;
export type TextVar = { type: "text" };
export type TextList = { type: "textList" };

export const newText = (): TextVar => ({ type: "text" });
export const newTextList = (): TextList => ({ type: "textList" });

export type VariableComparitor<V extends Variable> =
  V extends TextVar ? (string | TextVar) :
  V extends TextList ? (string | TextVar)[] :
  never;

export type VariableValue<V extends Variable> = V extends TextVar ? string : V extends TextList ? string[] : never;

export function isVariable(specField: { type: string }): specField is Variable {
  return specField.type === "text" || specField.type === "textList";
}

export function getInitValue(variable: Variable): VariableValue<Variable> {
  switch (variable.type) {
    case "text":
      return "";

    case "textList":
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
