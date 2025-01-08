require("dotenv").config();
const express = require("express");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = 3000;

app.use(express.json());

app.get("/api", async (req: any, res: any) => {
  res.send({ message: "API Reponse" });
});

app.post("/api/template", (req: any, res: any) => {
  const templateJson = req.body;

  if (!templateJson) {
    return res.status(400).send({ message: "No template JSON provided" });
  }

  const sessionId = uuidv4();

  if (!fs.existsSync("./sessions")) {
    fs.mkdirSync("./sessions");
  }

  const filePath = `./sessions/${sessionId}.json`;
  fs.writeFileSync(filePath, JSON.stringify(templateJson));

  res.status(200).send({ sessionId });
});

app.get("/api/suggestions", async (req: any, res: any) => {
  const sessionId = req.query.sessionId;

  if (!sessionId) {
    return res.status(400).send({ message: "No sessionId provided" });
  }

  const filePath = `./sessions/${sessionId}.json`;

  if (filePath.includes("../") || filePath.includes("..\\")) {
    throw new Error("Invalid file path");
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ message: "Session not found" });
  }

  const templateJson: Doc = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  const parsed = templateJson.variables.map((variable) => {
    return {
      resourceId: variable.id,
      type: "variable",
      content: JSON.stringify(variable.value),
      currentName: variable.name,
    };
  });

  templateJson.pages.forEach((page) => {
    page.frames.forEach((frame) => {
      if (frame.type === "text") {
        parsed.push({
          resourceId: frame.id,
          type: "frame",
          content: JSON.stringify(frame.textContent),
          currentName: frame.name,
        });
        console.log(frame);
      }
    });
  });

  const parsedToolCalls = JSON.parse(toolCalls);
  const output = parsedToolCalls.variables.map((variable: any) => {
    return {
      id: uuidv4(),
      resourceId: variable.resourceId,
      resourceType: variable.resourceType,
      newVariableName: variable.betterName,
      newLabelName: variable.betterLabelName,
      isDefaultName: variable.isDefaultName,
    };
  });

  res.status(200).send({ output });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
