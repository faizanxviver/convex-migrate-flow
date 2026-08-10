import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Leader plans with an unmet team-investment requirement are evaluated hourly.
crons.cron("leader-plan-checks", "0 * * * *", api.leaderPlans.cronRunLeaderPlanChecks);

export default crons;
