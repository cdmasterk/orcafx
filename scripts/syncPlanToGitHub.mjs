#!/usr/bin/env node
import fetch from "node-fetch";
import fs from "fs";

const GH_TOKEN = process.env.GH_TOKEN;
const GH_OWNER = "cdmasterk";      // fiksirano po tvom usernamu
const GH_OWNER_TYPE = "user";      // jer ide preko /users/
const GH_PROJECT_NUMBER = 6;       // broj iz URL-a
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

// Parsiraj module iz markdowna
function parseModules(md) {
  const lines = md.split("\n");
  const out = [];
  let phase = "Backlog";

  for (const raw of lines) {
    const line = raw.trim();

    if (line.startsWith("### 1.")) phase = "MVP";
    else if (line.startsWith("### 2.")) phase = "Phase 2";
    else if (line.startsWith("### 3.")) phase = "Phase 3";
    else if (line.startsWith("### 4.")) phase = "Phase 4";

    if (line.startsWith("- **")) {
      const m = line.match(/- \*\*(.+?)\*\*/);
      const name = (m ? m[1] : line).trim();
      out.push({ title: `${phase} — ${name}` });
    }
  }
  return out;
}

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

    // Dohvati project V2 info
    const queryProject = `
      query($login: String!, $number: Int!) {
        ${GH_OWNER_TYPE}(login: $login) {
          projectV2(number: $number) {
            id
            title
            items(first: 50) {
              nodes {
                id
                content {
                  __typename
                  ... on DraftIssue { title }
                  ... on Issue { title }
                  ... on PullRequest { title }
                }
              }
            }
          }
        }
      }
    `;

    const data = await ghGraphQL(queryProject, {
      login: GH_OWNER,
      number: GH_PROJECT_NUMBER,
    });

    console.log("📡 GraphQL Response:", JSON.stringify(data, null, 2));

    const project = data?.[GH_OWNER_TYPE]?.projectV2;
    if (!project) {
      console.error("❌ Project not found, check GH_OWNER / GH_PROJECT_NUMBER / token scopes");
      process.exit(1);
    }

    console.log(`✅ Found project: ${project.title} (ID: ${project.id})`);
    const existingTitles = new Set(
      project.items.nodes.map((n) => n.content?.title).filter(Boolean)
    );

    // Parsiraj module iz plana
    const modules = parseModules(planContent);
    console.log("📖 Parsed modules:", modules);

    // Dodaj nove module kao draft issues
    for (const m of modules) {
      if (existingTitles.has(m.title)) {
        console.log(`• Skip (exists): ${m.title}`);
        continue;
      }

      console.log(`➕ Creating: ${m.title}`);
      const mutation = `
        mutation($projectId:ID!, $title:String!) {
          createProjectV2DraftIssue(input:{projectId:$projectId, title:$title}) {
            draftIssue { id title }
          }
        }
      `;

      const result = await ghGraphQL(mutation, {
        projectId: project.id,
        title: m.title,
      });

      console.log("✅ Created:", result.createProjectV2DraftIssue?.draftIssue?.title);
    }

    console.log("🎉 Sync completed.");
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    process.exit(1);
  }
})();
