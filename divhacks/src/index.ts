import { imessage } from "@spectrum-ts/imessage";
import { Spectrum } from "spectrum-ts";

import { startAuthServer } from "./auth";
import { APP_NAME } from "./config";

const projectId = process.env.PROJECT_ID?.trim();
const projectSecret = process.env.PROJECT_SECRET?.trim();
if (!projectId || !projectSecret) {
  throw new Error("Missing PROJECT_ID or PROJECT_SECRET in .env");
}

const app = await Spectrum({
  projectId,
  projectSecret,
  providers: [imessage.config()],
});

const port = Number(process.env.PORT ?? 8787);
startAuthServer(port, async (phone, code) => {
  const im = imessage(app);
  const person = await im.user(phone);
  const chat = await im.space.create(person);
  await chat.send(`Your ${APP_NAME} code is ${code}. It expires in 10 minutes.`);
});

for await (const [space, message] of app.messages) {
  if (message.content.type === "text") {
    await space.send(`echo: ${message.content.text}`);
  }
}
