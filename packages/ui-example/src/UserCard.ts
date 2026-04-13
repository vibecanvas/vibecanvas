import { component, html } from "@arrow-js/core";
import type { Props } from "@arrow-js/core";
import { UserName } from "./UserName.ts";

export const UserCard = component((props: Props<{ id: string }>) =>
  html`<article>${UserName(props)}</article>`
);
