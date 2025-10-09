#!/usr/bin/env node
import fs from "fs";

const GH_TOKEN = process.env.GH_TOKEN;
const GH_OWNER = "cdmasterk";     // tvoj username
const GH_OWNER_TYPE = "user";
const GH_PROJECT_NUMBER = 6;
const PLAN_FILE = "docs/ORCAFX_CORE_PLAN.md";

// --- Hardcode repo ime da nema dileme ---
const GH_REPO = "orcafx";
console.log("🐙 Using repo:", GH_OWNER, GH_REPO);

// --- GraphQL helper ---
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
    throw new Error(JSON.stringify(json.errors, null, 2));
  }
  return json.data;
}

// --- Parse modules from Markdown ---
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
      out.push({ title: name, phase });
    }
  }
  return out;
}

// --- PUSH: Plan → GitHub ---
async function pushPlan() {
  const md = fs.readFileSync(PLAN_FILE, "utf-8");
  const modules = parseModules(md);

  // Repo ID
  const repoQ = `
    query($owner: String!, $name: String!) {
      repository(owner:$owner, name:$name) {
        id
        issues(first: 100) { nodes { id title number } }
      }
    }
  `;
  const repoData = await ghGraphQL(repoQ, { owner: GH_OWNER, name: GH_REPO });

  // 🐞 Debug ispis cijelog odgovora
  console.log("📡 Raw repo query response:", JSON.stringify(repoData, null, 2));

  if (!repoData || !repoData.repository) throw new Error("❌ Repo not found (check PAT permissions)");
  const repoId = repoData.repository.id;
  const existingIssues = repoData.repository.issues.nodes;

  // Project
  const projectQ = `
    query($login: String!, $number: Int!) {
      ${GH_OWNER_TYPE}(login:$login) {
        projectV2(number:$number) {
          id
          title
          items(first: 100) {
            nodes { id content { ... on Issue { id title number } } }
          }
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id name options { id name }
              }
            }
          }
        }
      }
    }
  `;
  const pdata = await ghGraphQL(projectQ, { login: GH_OWNER, number: GH_PROJECT_NUMBER });
  const project = pdata?.[GH_OWNER_TYPE]?.projectV2;
  if (!project) throw new Error("❌ Project not found");
  const statusField = project.fields.nodes.find(f => f.name === "Status");

  console.log(`✅ Found project: ${project.title}`);

  for (const m of modules) {
    const existing = existingIssues.find(i => i.title === m.title);
    let issueId = existing?.id;

    // Create if missing
    if (!existing) {
      console.log(`➕ Creating issue: ${m.title}`);
      const createIssue = `
        mutation($repo: ID!, $title: String!) {
          createIssue(input:{repositoryId:$repo, title:$title}) {
            issue { id title number }
          }
        }
      `;
      const issue = await ghGraphQL(createIssue, { repo: repoId, title: m.title });
      issueId = issue.createIssue.issue.id;
    }

    // Add to project
    const item = project.items.nodes.find(it => it.content?.title === m.title);
    let itemId = item?.id;
    if (!itemId) {
      const addMutation = `
        mutation($projectId:ID!, $contentId:ID!) {
          addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) {
            item { id }
          }
        }
      `;
      const added = await ghGraphQL(addMutation, { projectId: project.id, contentId: issueId });
      itemId = added.addProjectV2ItemById.item.id;
    }

    // Update status
    if (statusField) {
      const option = statusField.options.find(o => o.name === m.phase);
      if (option) {
        const setField = `
          mutation($projectId:ID!, $itemId:ID!, $fieldId:ID!, $optionId:String!) {
            updateProjectV2ItemFieldValue(
              input:{
                projectId:$projectId,
                itemId:$itemId,
                fieldId:$fieldId,
                value:{singleSelectOptionId:$optionId}
              }
            ){ projectV2Item { id } }
          }
        `;
        await ghGraphQL(setField, {
          projectId: project.id,
          itemId,
          fieldId: statusField.id,
          optionId: option.id,
        });
        console.log(`✅ Set status '${m.phase}' for ${m.title}`);
      }
    }
  }
  console.log("🎉 Push complete.");
}

// --- PULL: GitHub → Plan ---
async function pullPlan() {
  const projectQ = `
    query($login: String!, $number: Int!) {
      ${GH_OWNER_TYPE}(login:$login) {
        projectV2(number:$number) {
          title
          items(first: 100) {
            nodes {
              content { ... on Issue { title } }
              fieldValues(first: 10) {
                nodes {
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field { ... on ProjectV2SingleSelectField { name } }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const pdata = await ghGraphQL(projectQ, { login: GH_OWNER, number: GH_PROJECT_NUMBER });
  const project = pdata?.[GH_OWNER_TYPE]?.projectV2;
  if (!project) throw new Error("❌ Project not found");

  let md = `# ORCAFX Core Plan\n\n`;
  let currentPhase = "";
  for (const item of project.items.nodes) {
    const title = item.content?.title;
    if (!title) continue;
    const status = item.fieldValues.nodes.find(f => f.field.name === "Status")?.name || "Backlog";
    if (status !== currentPhase) {
      md += `\n### ${status}\n`;
      currentPhase = status;
    }
    md += `- **${title}**\n`;
  }
  fs.writeFileSync(PLAN_FILE, md, "utf-8");
  console.log(`📥 Pulled project into ${PLAN_FILE}`);
}

// --- Entrypoint ---
const mode = process.argv[2];
if (mode === "--push") pushPlan();
else if (mode === "--pull") pullPlan();
else console.log("Usage: node scripts/syncPlanToGitHub.mjs --push | --pull");
