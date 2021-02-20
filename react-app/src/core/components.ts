

export type Component = Input | Button;
export type Input = { type: "input"; inputType?: "text" | "number" | "password" | "email" };
export type Button = { type: "button" };

export const newInput = (opts?: { inputType?: Input["inputType"] }): Input => ({ ...opts, type: "input" });
export const newButton = (): Button => ({ type: "button" });

export function isComponent(specField: { type: string }): specField is Component {
  return specField.type === "input" || specField.type === "button";
}

export function getComponentName(components: { name: string; component: Component }[], origComponent: Component): string {
  const componentInfo = components.find(({component}) => component === origComponent);

  if (!componentInfo) {
    throw Error(`Unknown component of type ${origComponent.type}. Did you forget to return one in your spec?`)
  }

  return componentInfo.name
}
