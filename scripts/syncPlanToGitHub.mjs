#!/usr/bin/env node
import fs from "fs";

const GH_TOKEN = process.env.GH_TOKEN;
const GH_OWNER = "cdmasterk";     // tvoj username
const GH_REPO = "orcafx";         // ime repozitorija
const GH_OWNER_TYPE = "user";
const GH_PROJECT_NUMBER = 6;
const PLAN_FILE = "docs/ORCAFX_CORE_PLAN.md";

// --- GraphQL helper
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

// --- Parse modules
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

(async () => {
  const md = fs.readFileSync(PLAN_FILE, "utf-8");
  const modules = parseModules(md);

  // 1) Get repoId + existing issues
  const repoQ = `
    query($owner: String!, $name: String!) {
      repository(owner:$owner, name:$name) {
        id
        issues(first: 100, orderBy:{field:CREATED_AT, direction:DESC}) {
          nodes { id title number }
        }
      }
    }
  `;
  const repoData = await ghGraphQL(repoQ, { owner: GH_OWNER, name: GH_REPO });
  const repoId = repoData.repository.id;
  const existingIssues = repoData.repository.issues.nodes;
  const existingTitles = new Set(existingIssues.map(i => i.title));

  // 2) Get project + status field
  const projectQuery = `
    query($login: String!, $number: Int!) {
      ${GH_OWNER_TYPE}(login: $login) {
        projectV2(number: $number) {
          id
          title
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options { id name }
              }
            }
          }
        }
      }
    }
  `;
  const pdata = await ghGraphQL(projectQuery, {
    login: GH_OWNER,
    number: GH_PROJECT_NUMBER,
  });
  const project = pdata?.[GH_OWNER_TYPE]?.projectV2;
  if (!project) throw new Error("Project not found");

  console.log(`✅ Found project: ${project.title}`);
  const statusField = project.fields.nodes.find(f => f.name === "Status");

  // 3) Loop modules
  for (const m of modules) {
    if (existingTitles.has(m.title)) {
      console.log(`• Skip (already exists): ${m.title}`);
      continue;
    }

    console.log(`➕ Creating new issue for: ${m.title}`);

    // Create issue
    const issueMutation = `
      mutation($repo: ID!, $title: String!) {
        createIssue(input:{repositoryId:$repo, title:$title}) {
          issue { id number title }
        }
      }
    `;
    const issue = await ghGraphQL(issueMutation, { repo: repoId, title: m.title });
    const issueId = issue.createIssue.issue.id;

    // Add to project
    const addMutation = `
      mutation($projectId:ID!, $contentId:ID!) {
        addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) {
          item { id }
        }
      }
    `;
    const added = await ghGraphQL(addMutation, {
      projectId: project.id,
      contentId: issueId,
    });
    const itemId = added.addProjectV2ItemById.item.id;

    // Set Status
    if (statusField) {
      const option = statusField.options.find(o => o.name === m.phase);
      if (option) {
        const setFieldMutation = `
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
        await ghGraphQL(setFieldMutation, {
          projectId: project.id,
          itemId,
          fieldId: statusField.id,
          optionId: option.id,
        });
        console.log(`✅ Set status '${m.phase}' for ${m.title}`);
      } else {
        console.warn(`⚠️ No status option for '${m.phase}'`);
      }
    }
  }
})();
