require("dotenv").config();
const express = require("express");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = 3000;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tool: ChatCompletionTool[] = [
  {
    function: {
      name: "rename_variables",
      description:
        "Rename multiple variable or frame names and give better suggestions or names based on the context provided in a JSON object. if you find that the currentname is already a good name you can keep the name as is.",
      strict: true,
      parameters: {
        type: "object",
        properties: {
          variables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                currentName: {
                  type: "string",
                  description: "The current name of the variable.",
                },
                resourceId: {
                  type: "string",
                  description: "The id of the variable or frame.",
                },
                resourceType: {
                  type: "string",
                  description: "The type of the resource. If it is a variable or frame so for type text you can just set it to frame.",
                },
                betterName: {
                  type: "string",
                  description:
                    "The new name of the variable that is more descriptive.",
                },
                betterLabelName: {
                  type: "string",
                  description:
                    "The new label name of the variable that is more descriptive and this will be the display name for the end-user.",
                },
                isDefaultName: {
                  type: "boolean",
                  description:
                    "A boolean value to indicate if the new name of the frame or variable is the default name. If the name of the variable or frame is the same as the current name you can set this to true otherwise false.",
                },
              },
              required: [
                "currentName",
                "resourceId",
                "resourceType",
                "betterName",
                "betterLabelName",
                "isDefaultName",
              ],
              additionalProperties: false,
            },
            description:
              "An array of variables and frames with their current names and better suggestions.",
          },
        },
        additionalProperties: false,
        required: ["variables"],
      },
    },
    type: "function",
  },
];

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
  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ message: "Session not found" });
  }

  const templateJson: ChiliDocument = JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  );

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

  let conversation: ChatCompletionMessageParam[] = [
    { role: "system", content: "You are a helpful assistant." },
    {
      role: "user",
      content: `I will provide a list of variables and frames. 
      By default, they are named 'Variable (x)', 'Text', or 'Image'. 
      Your job is to rename the resources to a more descriptive name. 
      Here is a list of the current resources: ${JSON.stringify(parsed)}`,
    },
  ];

  let openaiResponse = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: conversation,
    stream: false,
    tools: tool,
  });

  const toolCalls =
    openaiResponse.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!toolCalls) {
    return res
      .send({ message: "There is no correct toolcall to execute your request" });
  }

  // output of the LLM (use tools to structure output) [{ "id": string, "type": "rename_variable" | "rename_frame", "resourceId": string, "newName": string, "isDefaultName": boolean }]
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
