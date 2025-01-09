import express from "express";
import { renderMessages } from "./templates";

const app = express();
app.use(express.json());
const PORT = 3000;

const recipients = [
  { first_name: "John", last_name: "Smith" },
  { first_name: "Jane", last_name: "Doe" },
];

app.post("/renderMessages", function (req, res) {
  const result = renderMessages(req.body.messageTemplate, recipients);
  res.send(result);
});

app.listen(PORT, function (err) {
  if (err) console.log(err);
  console.log("Server listening on PORT", PORT);
});
