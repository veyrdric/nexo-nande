// Chat por consola contra el backend en marcha: npm run test:chat
import readline from "node:readline/promises";
import crypto from "node:crypto";

const URL = process.env.API_URL || "http://localhost:3005";
const sessionId = crypto.randomUUID();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log(`Conectado a ${URL}. Escribí "salir" para terminar.\n`);
while (true) {
  const message = (await rl.question("Vos: ")).trim();
  if (!message) continue;
  if (message === "salir") break;
  const res = await fetch(`${URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
  const data = await res.json();
  console.log(`Bot: ${data.reply ?? JSON.stringify(data)}\n`);
}
rl.close();
