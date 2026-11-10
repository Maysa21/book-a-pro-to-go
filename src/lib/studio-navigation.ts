export type StudioView = "overview" | "create" | "details";
export type StudioAction = { type: "create" | "open" | "back" | "saved"; hasBusiness: boolean };

export function studioNavigation(view: StudioView, action: StudioAction): StudioView {
  switch (action.type) {
    case "create": return action.hasBusiness ? view : "create";
    case "open": return action.hasBusiness ? "details" : view;
    case "back": return "overview";
    case "saved": return view === "create" ? "overview" : view;
  }
}