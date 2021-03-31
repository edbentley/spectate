import { SpecBase } from "./spec";
import { SpecState, getValueFromState } from "./state";
import {
  EventContext,
  EventPosition,
  formatEventPosition,
  getEffectActions,
  SpecEventAction,
} from "./events";
import {
  getVariableName,
  ListAddBehaviour,
  ListBehaviours,
  ListRemoveBehaviour,
  Variable,
  VariableComparitor,
  VariableValue,
} from "./variables";
import {
  Effect,
  EffectResult,
  EffectResultState,
  EffectVal,
  ResolvedEffectVal,
} from "./effects";
import { replaceArray } from "./utils";

/**
 * Returns next state based on action, and any list behaviours it has
 * determined.
 */
export function handleActionGeneratingModel<Spec extends SpecBase>(
  action: SpecEventAction,
  specState: SpecState<Spec>,
  resultState: EffectResultState,
  variables: { name: string; variable: Variable }[],
  position: EventPosition,
  eventContext: EventContext,
  specDescriptions: string[]
): {
  specState: SpecState<Spec>;
  resultState: EffectResultState;
  listBehaviours?:
    | ListBehaviourAddResult
    | ListBehaviourRemoveResult
    | ListBehaviourNothingResult;
} {
  const getPosString = () => formatEventPosition(position, specDescriptions);

  switch (action.type) {
    case "doEffect":
      // No-op
      return { specState, resultState };

    case "getEffect":
      // Set the result state to the example provided
      return {
        specState,
        resultState: addEffectResult(
          resultState,
          action.result.effect,
          action.result.example
        ),
      };

    case "equals": {
      const { variable, value } = action;
      const variableName = getVariableName(variables, variable);

      const newValue = getValueFromState(
        value,
        variables,
        specState,
        resultState
      );

      const behaviours: ListBehaviours = {
        add: new Set(),
        remove: new Set(),
      };

      const index = eventContext.index;

      if (variable.type === "variableList") {
        const prevValue = specState.state[variableName];

        if (!Array.isArray(newValue) || !Array.isArray(prevValue)) {
          throw Error(
            `Can only set a variable list to an array in ${getPosString()}`
          );
        }

        // Add to list behaviours

        const newValueStart = newValue[0];
        const newValueEnd = newValue[newValue.length - 1];
        const prevValueStart = prevValue[0];
        const prevValueEnd = prevValue[prevValue.length - 1];

        if (newValue.length === prevValue.length) {
          // Arrays are the same length
          // If all values the same, it's a no-op
          if (
            newValue.length === 0 ||
            newValue.every((val, index) => val === prevValue[index])
          ) {
            // Return early
            return {
              specState,
              resultState,
              listBehaviours: { type: "doNothing", name: variableName },
            };
          } else {
            // Values different so array was overwritten
            behaviours.add.add("overwrite");
          }
        } else if (newValue.length === 0) {
          // Set empty array

          if (prevValue.length > 1) {
            // Length 2 or more -> 0 must mean remove all
            behaviours.remove.add("removeAll");
          } else {
            // Length 1 -> 0 could have removed from anywhere
            behaviours.remove.add("removeAll");
            behaviours.remove.add("removeFromEnd");
            behaviours.remove.add("removeFromIndex");
            behaviours.remove.add("removeFromStart");
          }
        } else if (newValue.length === prevValue.length + 1) {
          // We added to array

          if (prevValue.length === 0) {
            // Previous array was empty so could have added anywhere
            behaviours.add.add("addToEnd");
            behaviours.add.add("addToStart");
          } else if (newValueStart === prevValueStart) {
            // Both arrays start the same, so was added at the end
            behaviours.add.add("addToEnd");
          } else if (newValueEnd === prevValueEnd) {
            // New value added at the beginning since end values the same
            behaviours.add.add("addToStart");
          }
        } else if (newValue.length === prevValue.length - 1) {
          // We removed from array

          if (index !== undefined) {
            // We have some information on index
            if (
              newValueStart === prevValueStart &&
              newValueEnd === prevValueEnd
            ) {
              // Arrays start and end the same, so was probably removed from index
              behaviours.remove.add("removeFromIndex");
            } else if (newValueStart !== prevValueStart) {
              // Both arrays start different, could be removed there or index
              behaviours.remove.add("removeFromIndex");
              behaviours.remove.add("removeFromStart");
            } else if (newValueEnd !== prevValueEnd) {
              // Both arrays end different, could be removed there or index
              behaviours.remove.add("removeFromIndex");
              behaviours.remove.add("removeFromEnd");
            }
          } else {
            if (
              newValueStart === prevValueStart &&
              newValueEnd === prevValueEnd
            ) {
              // Arrays start and end the same with no index context, so error
              throw Error(
                `Must remove array list at beginning or end without list context in ${getPosString()}`
              );
            } else if (newValueStart === prevValueStart) {
              // Both arrays start the same, so was removed from the end
              behaviours.remove.add("removeFromEnd");
            } else if (newValueEnd === prevValueEnd) {
              // Both arrays end the same, so was removed from the start
              behaviours.remove.add("removeFromStart");
            }
          }
        } else {
          throw Error(
            `Invalid array operation in ${getPosString()} You can only add one element at the beginning or end of array, and can only remove one element from beginning, end or list index of array`
          );
        }

        return {
          specState: {
            ...specState,
            state: {
              ...specState.state,
              [variableName]: newValue,
            },
          },
          resultState,
          listBehaviours:
            behaviours.add.size > 0
              ? {
                  type: "add",
                  behaviours: behaviours.add,
                  name: variableName,
                  listEqualsVar: value,
                }
              : behaviours.remove.size > 0
              ? {
                  type: "remove",
                  behaviours: behaviours.remove,
                  name: variableName,
                  index,
                }
              : undefined,
        };
      }

      // All other variable types are a simple set state

      return {
        specState: {
          ...specState,
          state: {
            ...specState.state,
            [variableName]: newValue,
          },
        },
        resultState,
      };
    }
  }
}

/**
 * Returns next state based on action. May produce side effects from actions.
 */
export async function handleActionRunningApp<Spec extends SpecBase>(
  action: SpecEventAction,
  specState: SpecState<Spec>,
  resultState: EffectResultState,
  variables: { name: string; variable: Variable }[],
  eventContext: EventContext,
  listBehaviour?: { add: ListAddBehaviour; remove: ListRemoveBehaviour }
): Promise<{
  specState: SpecState<Spec>;
  resultState: EffectResultState;
}> {
  switch (action.type) {
    case "doEffect": {
      function getVal<V extends Variable>(variable: V) {
        const variableName = getVariableName(variables, variable);
        return (specState.state[variableName] as unknown) as VariableValue<
          typeof variable
        >;
      }
      action.effect.fn(getVal, eventContext);
      return { specState, resultState };
    }

    case "getEffect": {
      // Set the result state to the value returned by the effect
      function getVal<V extends Variable>(variable: V) {
        const variableName = getVariableName(variables, variable);
        return (specState.state[variableName] as unknown) as VariableValue<
          typeof variable
        >;
      }
      const result = await action.result.effect.fn(getVal, eventContext);
      const newResultState = addEffectResult(
        resultState,
        action.result.effect,
        result
      );

      const branchActions = getEffectActions(action, result);

      return branchActions.reduce(async (prevPromise, branchAction) => {
        const prev = await prevPromise;
        return handleActionRunningApp(
          branchAction,
          prev.specState,
          prev.resultState,
          variables,
          eventContext,
          listBehaviour
        );
      }, Promise.resolve({ specState, resultState: newResultState }));
    }

    case "equals": {
      const { variable, value } = action;
      const variableName = getVariableName(variables, variable);

      if (action.behaviour && listBehaviour) {
        // Use list behaviour to determine change of state

        const prevValue = specState.state[variableName] as string[];

        if (action.behaviour.type === "shouldAdd") {
          const behaviour = listBehaviour.add;
          const { listEqualsVar } = action.behaviour;
          const listEqualsVal = getValueFromState(
            listEqualsVar,
            variables,
            specState,
            resultState
          ) as string[];

          let newArray: string[] = [];

          if (behaviour === "addToEnd") {
            newArray = [...prevValue, listEqualsVal[listEqualsVal.length - 1]];
          } else if (behaviour === "addToStart") {
            newArray = [listEqualsVal[0], ...prevValue];
          } else {
            // overwrite
            newArray = listEqualsVal;
          }

          return {
            specState: {
              ...specState,
              state: {
                ...specState.state,
                [variableName]: newArray,
              },
            },
            resultState,
          };
        } else if (action.behaviour.type === "shouldRemove") {
          const behaviour = listBehaviour.remove;
          const { index } = eventContext;

          const newArray =
            behaviour === "removeAll"
              ? []
              : behaviour === "removeFromEnd"
              ? prevValue.slice(0, prevValue.length - 1)
              : behaviour === "removeFromStart"
              ? prevValue.slice(1)
              : behaviour === "removeFromIndex" && index !== undefined
              ? [...prevValue.slice(0, index), ...prevValue.slice(index + 1)]
              : [];

          return {
            specState: {
              ...specState,
              state: {
                ...specState.state,
                [variableName]: newArray,
              },
            },
            resultState,
          };
        }
        return { specState, resultState };
      }

      // Other equals cases are a simple set the state

      const newValue = getValueFromState(
        value,
        variables,
        specState,
        resultState
      );

      return {
        specState: {
          ...specState,
          state: {
            ...specState.state,
            [variableName]: newValue,
          },
        },
        resultState,
      };
    }
  }
}

type ListBehaviourAddResult = {
  type: "add";
  behaviours: Set<ListAddBehaviour>;
  name: string;
  listEqualsVar: VariableComparitor<Variable> | EffectResult<EffectVal>;
};
type ListBehaviourRemoveResult = {
  type: "remove";
  behaviours: Set<ListRemoveBehaviour>;
  name: string;
  index?: number;
};
type ListBehaviourNothingResult = {
  type: "doNothing";
  name: string;
};

function addEffectResult<Val extends ResolvedEffectVal>(
  resultState: EffectResultState,
  resultEffect: Effect<EffectVal>,
  resultValue: Val
): EffectResultState {
  const existingResultStateIndex = resultState.findIndex(
    (r) => r.effect === resultEffect
  );
  if (existingResultStateIndex !== -1) {
    return replaceArray(
      resultState,
      {
        ...resultState[existingResultStateIndex],
        state: resultValue,
      },
      existingResultStateIndex
    );
  }
  return [
    ...resultState,
    {
      effect: resultEffect,
      state: resultValue,
    },
  ];
}
