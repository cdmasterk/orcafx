// api/ly-reindex.js
import { exec } from "child_process";

export default async function handler(req, res) {
  exec("npm run ly:index", { cwd: process.cwd() }, (error, stdout, stderr) => {
    if (error) {
      console.error(stderr);
      return res.status(500).send(`Error: ${error.message}`);
    }
    res.status(200).send(`✅ LY reindex triggered\n\n${stdout}`);
  });
}
