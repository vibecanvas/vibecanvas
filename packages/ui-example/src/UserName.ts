import { component, html } from "@arrow-js/core";
import type { Props } from "@arrow-js/core";
import { api } from "@vibecanvas/ui";

export const UserName = component(
  async ({ id }: Props<{ id: string }>) => {
    const user = await api.users.get(id);
    return user.name;
  },
  { fallback: html`<span>Loading user…</span>` },
);
