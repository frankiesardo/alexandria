import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
    layout("routes/layout.tsx", [
      index("routes/home.tsx"),
      route("search", "routes/search.tsx"),
      route("chat/:id", "routes/chat.tsx"),
      route("api/:id", "routes/api.ts")])] satisfies RouteConfig;