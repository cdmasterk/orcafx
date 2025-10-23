// ly/triggerServer.js
import express from "express";
import { exec } from "child_process";

const TOKEN = process.env.LY_TRIGGER_TOKEN; // npr. stavi u .env.local
const app = express();

app.get("/trigger-index", (req, res) => {
  if (!TOKEN || req.query.token !== TOKEN) {
    return res.status(401).send("Unauthorized");
  }
  exec("node ly/indexRepo.js", { cwd: process.cwd() }, (err, stdout, stderr) => {
    if (err) return res.status(500).send(stderr);
    res.send(`OK\n${stdout}`);
  });
});

app.listen(3300, () => console.log("LY trigger listening on :3300"));
