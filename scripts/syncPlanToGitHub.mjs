#!/usr/bin/env node
import fetch from "node-fetch";
import fs from "fs";

const GH_TOKEN = process.env.GH_TOKEN;
const GH_OWNER = process.env.GH_OWNER;
const GH_OWNER_TYPE = process.env.GH_OWNER_TYPE; // "user" ili "org"
const GH_PROJECT_NUMBER = process.env.GH_PROJECT_NUMBER;
const PLAN_FILE = "docs/ORCAFX_CORE_PLAN.md";

// Debug env
console.log("🔧 Debug GH env:", {
  GH_OWNER,
  GH_OWNER_TYPE,
  GH_PROJECT_NUMBER,
  PLAN_FILE,
  TokenSet: GH_TOKEN ? "✅ yes" : "❌ missing",
});

// Učitaj plan
if (!fs.existsSync(PLAN_FILE)) {
  console.error(`❌ Plan file not found: ${PLAN_FILE}`);
  process.exit(1);
}
const planContent = fs.readFileSync(PLAN_FILE, "utf-8");

// GraphQL query za dohvat projekta
const queryProject = `
  query($login: String!, $number: Int!) {
    ${GH_OWNER_TYPE}(login: $login) {
      projectV2(number: $number) {
        id
        title
      }
    }
  }
`;

// GraphQL call
async function ghGraphQL(query, variables) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error("❌ GraphQL errors:", JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }
  return json.data;
}

(async () => {
  try {
    console.log("📡 Fetching project…");
    const data = await ghGraphQL(queryProject, {
      login: GH_OWNER,
      number: parseInt(GH_PROJECT_NUMBER, 10),
    });

    console.log("📡 GraphQL Response:", JSON.stringify(data, null, 2));

    const project = data?.[GH_OWNER_TYPE]?.projectV2;
    if (!project) {
      console.error("❌ Project not found, check GH_OWNER / GH_PROJECT_NUMBER / token scopes");
      process.exit(1);
    }

    console.log(`✅ Found project: ${project.title} (ID: ${project.id})`);

    // Ovdje bi slijedilo parsiranje plana i sync itema…
    console.log("📖 Plan content (preview):");
    console.log(planContent.split("\n").slice(0, 10).join("\n"));
    console.log("… (truncated)");

    console.log("🚀 [DEBUG MODE] – sync logic not executed, just tested project access.");
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
  }
})();
