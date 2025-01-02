import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default
    [index("routes/home.tsx"),
    route("search", "routes/search.tsx"),
    route("chat/:id", "routes/chat.tsx"),
    route("api/:id", "routes/api.ts")] satisfies RouteConfig;
