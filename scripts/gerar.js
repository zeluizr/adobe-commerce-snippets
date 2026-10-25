// @ts-check
"use strict";

// Gera os arquivos de snippets/ a partir de lib/snippets-*.js. Determinístico: o
// CI roda e falha se o resultado divergir do que está commitado.
//
//   node scripts/gerar.js

const fs = require("fs");
const path = require("path");
const { ARQUIVOS, gerarArquivo } = require("../lib/catalogo");

const RAIZ = path.join(__dirname, "..");

fs.mkdirSync(path.join(RAIZ, "snippets"), { recursive: true });
for (const [nome, snippets] of Object.entries(ARQUIVOS)) {
	const arquivo = `snippets/${nome}.code-snippets`;
	const gerado = gerarArquivo(snippets);
	fs.writeFileSync(path.join(RAIZ, arquivo), `${JSON.stringify(gerado, null, "\t")}\n`);
	console.log(`${arquivo}: ${Object.keys(gerado).length} snippets`);
}
