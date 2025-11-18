import betterAuth from "@convex-dev/better-auth/convex.config";
import crons from "@convex-dev/crons/convex.config.js";
import resend from "@convex-dev/resend/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(betterAuth);
app.use(crons);
app.use(resend);
export default app;
