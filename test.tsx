// Library

type SpecField = Component | StringText;
type Component = Input | Button;

type Input = { type: "input" };
type Button = { type: "button" };
type StringText = { type: "text" };

const newInput = (): Input => ({ type: "input" });
const newButton = (): Button => ({ type: "button" });
const newText = (): StringText => ({ type: "text" });

type SpecFn = (args: {
  sendPost: (json: unknown) => void;
  enterText: (text: StringText, example: string) => void;
  clickOn: (component: Component) => void;
}) => void;
type NewSpec = (description: string, spec: SpecFn) => void;
type SpecProps<Spec> = Record<keyof Spec, any>;
type SpecEvent =
  | { type: "sendPost"; json: unknown }
  | { type: "enterText"; text: StringText; example: string }
  | { type: "clickOn"; component: Component }

function useSpec<Spec extends Record<string, SpecField>>(getSpec: (newSpec: NewSpec) => Spec): SpecProps<Spec> {

  const events: SpecEvent[] = [];

  const sendPost = (json: unknown) => {
    events.push({ type: "sendPost", json });
  }

  const enterText = (text: StringText, example: string) => {
    events.push({ type: "enterText", text, example });
  }

  const clickOn = (component: Component) => {
    events.push({ type: "clickOn", component });
  }

  const newSpec: NewSpec = (description, specFn) => {
    specFn({
      sendPost,
      enterText,
      clickOn
    });
  }

  const spec = getSpec(newSpec);

  const specProps = generateSpecProps(spec, events);

  return specProps;
}

function generateSpecProps<Spec>(spec: Spec, events: SpecEvent[]): SpecProps<Spec> {
  const specFields = Object.entries(spec).map(([specName, specField]) => ({ specName, specField, metadata: null }));
  // TODO
  return spec;
}

// User

const mySpec = (newSpec: NewSpec) => {
  const Email = newInput();
  const EmailText = newText();

  const Password = newInput();
  const PasswordText = newText();

  const SignUp = newButton();

  newSpec("Can sign up with email and password", ({ clickOn, enterText, sendPost }) => {
    clickOn(Email);
    enterText(EmailText, "hi@test.com");

    clickOn(Password);
    enterText(PasswordText, "password!");

    clickOn(SignUp);

    sendPost({ email: EmailText, password: PasswordText });
  });

  return { Email, EmailText, Password, PasswordText, SignUp };
};

const MyComponent = () => {
  const props = useSpec(mySpec);

  return (
    <div>
      <label>Email</label>
      <input {...props.Email} />

      <label>Password</label>
      <input {...props.Password} />

      <button {...props.SignUp}>Sign Up</button>
    </div>
  )
};
