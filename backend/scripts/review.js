// Revisión humana de lo que entró por n8n: npm run review -- <comando>
//   list [estado]            lista documentos (opcional: pending_review | approved | rejected)
//   show <CODE>              muestra el texto indexado de un documento
//   approve <CODE...>        aprueba uno o varios
//   approve-prefix <PREFIJO> aprueba todos los pendientes que empiecen con el prefijo (ej. IPF-)
//   reject <CODE...>         rechaza (deja de usarse en el chat)
//   delete-prefix <PREFIJO>  borra del RAG todos los documentos con ese prefijo (ej. GOB-)
import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
dotenv.config();

const API = `http://localhost:${process.env.PORT || 3005}/api/rag`;
const headers = { "Content-Type": "application/json", "x-ingest-secret": process.env.RAG_INGEST_SECRET || "" };
const [command, ...args] = process.argv.slice(2);

const api = async (method, route, body) => {
  const res = await fetch(`${API}${route}`, { method, headers, body: body && JSON.stringify(body) });
  const data = res.status === 204 ? {} : await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${JSON.stringify(data)}`);
  return data;
};

const setStatus = async (codes, status) => {
  for (const code of codes) {
    await api("POST", `/documents/${encodeURIComponent(code)}/status`, { status });
    console.log(`${status.padEnd(14)} ${code}`);
  }
};

const { documents } = await api("GET", "/documents");

if (command === "list") {
  const rows = documents.filter((d) => !args[0] || d.status === args[0]).sort((a, b) => a.code.localeCompare(b.code));
  for (const d of rows) console.log(`${d.status.padEnd(14)} ${d.code.padEnd(34)} ${String(d.chunkCount).padStart(3)} frag.  ${d.title}`);
  console.log(`\n${rows.length} documento(s)`);
} else if (command === "show") {
  // Lectura directa del almacén para ver exactamente qué va a leer el modelo
  const store = JSON.parse(fs.readFileSync(path.resolve(process.env.RAG_STORE_PATH || "data/vector-store.json"), "utf8"));
  const doc = store.documents[args[0]];
  if (!doc) throw new Error("No existe ese código");
  console.log(`${doc.title}\n${doc.sourceUrl}\nEstado: ${doc.status}\n`);
  store.chunks.filter((c) => c.code === args[0]).forEach((c) => console.log(`--- fragmento ${c.index}\n${c.text}\n`));
} else if (command === "approve") {
  await setStatus(args, "approved");
} else if (command === "approve-prefix") {
  if (!args[0]) throw new Error("Falta el prefijo");
  await setStatus(documents.filter((d) => d.status === "pending_review" && d.code.startsWith(args[0])).map((d) => d.code), "approved");
} else if (command === "reject") {
  await setStatus(args, "rejected");
} else if (command === "delete-prefix") {
  if (!args[0]) throw new Error("Falta el prefijo");
  const codes = documents.filter((d) => d.code.startsWith(args[0])).map((d) => d.code);
  for (const code of codes) await api("DELETE", `/documents/${encodeURIComponent(code)}`);
  console.log(`Borrados ${codes.length} documento(s) con prefijo ${args[0]}`);
} else {
  console.log("Comandos: list [estado] | show <CODE> | approve <CODE...> | approve-prefix <PREFIJO> | reject <CODE...> | delete-prefix <PREFIJO>");
}
