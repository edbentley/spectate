import { useEffect, useMemo, useState } from "react";
import { NewSpec, SpecBase } from "../core/spec";
import {
  SpecComponentHandlers,
  getComponentHandlers,
} from "../core/componentHandlers";
import { parseSpec } from "../core/parse";
import { SpecState } from "../core/state";
import { isVariable, Variable, VariableValue } from "../core/variables";
import {
  Input,
  Button,
  Component,
  isComponent,
  ComponentList,
} from "../core/components";
import { EffectResultState } from "../core/effects";

export type SpecProps<Spec> = {
  [K in keyof Spec]: SpecFieldProps<Spec[K]>;
};
type SpecFieldProps<Field> = Field extends Variable
  ? VariableValue<Field>
  : Field extends Input
  ? React.InputHTMLAttributes<HTMLInputElement>
  : Field extends Button
  ? React.ButtonHTMLAttributes<HTMLButtonElement>
  : Field extends ComponentList<infer Component, infer Variable>
  ? (index: number) => SpecFieldProps<Component>
  : never;

/**
 * Get the spec for app.
 */
export function useSpec<Spec extends SpecBase>(
  getSpec: (newSpec: NewSpec) => Spec
): SpecProps<Spec> {
  const {
    spec,
    events,
    initSpecState,
    initEffectResultState,
    specDescriptions,
  } = useMemo(() => parseSpec(getSpec), [getSpec]);

  const [specState, setSpecState] = useState(initSpecState);
  const [resultState, setResultState] = useState(initEffectResultState);

  const componentHandlers = useMemo(
    () =>
      getComponentHandlers(
        spec,
        events,
        setSpecState,
        setResultState,
        specDescriptions
      ),
    [spec]
  );

  useEffect(() => {
    componentHandlers.onPageLoad(specState, resultState);
  }, []);

  return getProps(componentHandlers, spec, specState, resultState);
}

function getProps<Spec extends SpecBase>(
  componentHandlers: SpecComponentHandlers<Spec>,
  spec: Spec,
  specState: SpecState<Spec>,
  resultState: EffectResultState
): SpecProps<Spec> {
  const specProps: Partial<Record<keyof Spec, unknown>> = {};

  Object.entries(spec).forEach(([name, fieldValue]) => {
    const fieldName = name as keyof Spec;

    if (isComponent(fieldValue)) {
      specProps[fieldName] = getComponentProps(
        name,
        fieldValue,
        specState,
        resultState,
        componentHandlers
      );
    } else if (isVariable(fieldValue)) {
      specProps[fieldName] = specState.state[fieldName];
    }
  });

  return specProps as SpecProps<Spec>;
}

type HTMLElementProps =
  | React.ButtonHTMLAttributes<HTMLButtonElement>
  | React.InputHTMLAttributes<HTMLInputElement>;

function getComponentProps<Spec extends SpecBase>(
  name: string,
  component: Component,
  specState: SpecState<Spec>,
  resultState: EffectResultState,
  componentHandlers: SpecComponentHandlers<Spec>
): HTMLElementProps | ((index: number) => HTMLElementProps) {
  switch (component.type) {
    case "button":
      const buttonHandler = componentHandlers.buttons[name](
        specState,
        resultState
      );

      const buttonProps: React.ButtonHTMLAttributes<HTMLButtonElement> = {
        onClick: buttonHandler.onClick,
      };
      return buttonProps;

    case "input":
      const inputHandler = componentHandlers.inputs[name];

      // The variable whose value matches input
      const connectedVarName = inputHandler.connectedVariableName;

      const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
        value:
          connectedVarName !== null
            ? (specState.state[connectedVarName] as string)
            : "",
        onChange: (event) => {
          const newValue = event.target.value;
          inputHandler.onChange(newValue);
        },
        type: component.inputType,
      };
      return inputProps;

    case "componentList":
      const componentType = component.component.type;
      const handler = componentHandlers.lists[name](specState, resultState);

      if (componentType === "button" && "onClick" in handler) {
        return (index: number) => ({
          onClick: () => handler.onClick(index),
        });
      } else if (componentType === "input" && "onChange" in handler) {
        const connectedValues = specState.state[
          handler.connectedVariableName
        ] as string[];

        return (index: number) => {
          const inputProps: React.InputHTMLAttributes<HTMLInputElement> = {
            value: connectedValues[index] || "",
            onChange: (event) => {
              const newValue = event.target.value;
              handler.onChange(newValue, index);
            },
          };
          return inputProps;
        };
      }

      throw Error(`Couldn't find component list handlers for ${name}`);
  }
}
