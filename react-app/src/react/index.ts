import { useEffect, useMemo, useRef, useState } from "react";
import { NewSpec, SpecBase } from "../core/spec";
import { SpecComponentHandlers, processSpec, getComponentHandlers } from "../core/core";
import { getInitSpecState, SpecState } from "../core/state";
import { isVariable, TextList, TextVar } from "../core/variables";
import { Input, Button, Component, isComponent } from "../core/components";

export type SpecProps<Spec> = {
  [K in keyof Spec]:
    Spec[K] extends TextVar ? string :
    Spec[K] extends TextList ? string[] :
    Spec[K] extends Input ? React.InputHTMLAttributes<HTMLInputElement> :
    Spec[K] extends Button ? React.ButtonHTMLAttributes<HTMLButtonElement> :
    never;
}

/**
 * Get the spec for app.
 */
export function useSpec<Spec extends SpecBase>(getSpec: (newSpec: NewSpec) => Spec): SpecProps<Spec> {

  const { spec, events, initSpecState } = useMemo(() => processSpec(getSpec), [getSpec]);

  const [specState, setSpecState] = useState(initSpecState);

  const componentHandlers = useMemo(() => getComponentHandlers(spec, events, setSpecState), [spec, events]);

  return getProps(componentHandlers, spec, specState);

}

function getProps<Spec extends SpecBase>(
  componentHandlers: SpecComponentHandlers<Spec>,
  spec: Spec,
  specState: SpecState<Spec>
): SpecProps<Spec> {
  const specProps: Partial<Record<keyof Spec, unknown>> = {};

  Object.entries(spec).forEach(([name, fieldValue]) => {
    const fieldName = name as keyof Spec;

    if (isComponent(fieldValue)) {
      specProps[fieldName] = getComponentProps(name, fieldValue, specState, componentHandlers);
    } else if (isVariable(fieldValue)) {
      specProps[fieldName] = specState.state[fieldName];
    }
  });

  return specProps as SpecProps<Spec>;
}

function getComponentProps<Spec extends SpecBase>(
  name: string,
  component: Component,
  specState: SpecState<Spec>,
  componentHandlers: SpecComponentHandlers<Spec>,
): React.ButtonHTMLAttributes<HTMLButtonElement> | React.InputHTMLAttributes<HTMLInputElement> {
  switch (component.type) {
    case "button":
      const buttonHandler = componentHandlers.buttons[name](specState);

      const buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
        onClick: buttonHandler.onClick
      }
      return buttonProps;

    case "input":
      const inputHandler = componentHandlers.inputs[name](specState);

      // The variable whose value matches input
      const connectedVarName = inputHandler.connectedVariableName;

      const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
        value: connectedVarName !== null ? specState.state[connectedVarName] : "",
        onChange: event => {
          const newValue = event.target.value;
          inputHandler.onChange(newValue);
        },
        type: component.inputType
      }
      return inputProps;
  }

}
