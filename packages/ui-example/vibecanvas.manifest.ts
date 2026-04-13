import type { TVibecanvasManifest } from "@vibecanvas/ui";

export default {
  id: "ui-example-user-card",
  permissions: ["users.read"],
  toolButton: {
    icon: "user",
    label: "User Card",
  },
  defaultSize: {
    width: 280,
    height: 160,
  },
} satisfies TVibecanvasManifest;
