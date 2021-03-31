import { TextVar, Variable, VariableList } from "./variables";

export type Component = Input | Button | ComponentList<Component, Variable>;
export interface ComponentList<C extends Component, V extends Variable> {
  type: "componentList";
  component: C;
  connectedVariable: VariableList<V>;
}
export type Input = {
  type: "input";
  // Connected variable, not used in lists
  connectedVar?: TextVar;
  inputType?: "text" | "number" | "password" | "email";
};
export type Button = { type: "button" };

export const newComponentList = <C extends Component, V extends Variable>(
  component: C,
  variableList: VariableList<V>
): ComponentList<C, V> => ({
  type: "componentList",
  component,
  connectedVariable: variableList,
});

export const newInput = (
  optsOrConnectedVar?:
    | {
        connectedVar?: TextVar;
        inputType?: Input["inputType"];
      }
    | TextVar
): Input =>
  !optsOrConnectedVar
    ? { type: "input" }
    : "type" in optsOrConnectedVar
    ? { type: "input", connectedVar: optsOrConnectedVar }
    : {
        ...optsOrConnectedVar,
        type: "input",
      };
export const newButton = (): Button => ({ type: "button" });

export function isComponent(specField: {
  type: string;
}): specField is Component {
  return (
    specField.type === "input" ||
    specField.type === "button" ||
    specField.type === "componentList"
  );
}

export function getComponentName(
  components: { name: string; component: Component }[],
  origComponent: Component
): string {
  const componentInfo = components.find(
    ({ component }) => component === origComponent
  );

  if (!componentInfo) {
    throw Error(
      `Unknown component of type ${origComponent.type}. Did you forget to return one in your spec?`
    );
  }

  return componentInfo.name;
}
