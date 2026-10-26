// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { ARQUIVOS } = require("../lib/catalogo");

const RAIZ = path.join(__dirname, "..");
const pacote = JSON.parse(fs.readFileSync(path.join(RAIZ, "package.json"), "utf8"));
const ignorados = fs.readFileSync(path.join(RAIZ, ".vscodeignore"), "utf8");

/** Os arquivos que o git conhece (o que vai para o pacote sai daqui e das dependências). */
function arquivosDoRepo() {
	try {
		return execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: RAIZ, encoding: "utf8" })
			.split("\n")
			.filter(Boolean);
	} catch {
		return [];
	}
}

test("todo arquivo citado no package.json existe e é JSON válido", () => {
	const caminhos = [pacote.main, pacote.icon, ...pacote.contributes.snippets.map((/** @type {{path: string}} */ s) => s.path)];
	for (const relativo of caminhos) {
		const arquivo = path.join(RAIZ, relativo);
		assert.ok(fs.existsSync(arquivo), relativo);
		if (relativo.endsWith(".code-snippets")) JSON.parse(fs.readFileSync(arquivo, "utf8"));
	}
	for (const nome of Object.keys(ARQUIVOS)) {
		assert.ok(
			pacote.contributes.snippets.some((/** @type {{path: string}} */ s) => s.path === `./snippets/${nome}.code-snippets`),
			`snippets/${nome} sem linguagem no package.json`
		);
	}
});

test("o pacote não leva XSD nem código do magento2", () => {
	for (const arquivo of arquivosDoRepo()) {
		if (arquivo.startsWith("test/fixtures/")) continue;
		assert.ok(!arquivo.endsWith(".xsd"), `${arquivo}: XSD fora das fixtures`);
		if (/\.(png|vsix)$/.test(arquivo)) continue;
		const texto = fs.readFileSync(path.join(RAIZ, arquivo), "utf8");
		assert.doesNotMatch(texto, /See COPYING\.txt for license details|Copyright © Magento, Inc\./, arquivo);
	}
	// As fixtures próprias são escritas aqui, e o test/ não vai para o .vsix.
	assert.match(ignorados, /^test\/\*\*$/m);
	assert.match(ignorados, /^scripts\/\*\*$/m);
});

test("o validador em runtime não depende de arquivos excluídos do pacote", () => {
	const runtime = ["extension.js", "lib/validador.js", "lib/urn.js", "lib/componentes.js", "lib/mensagens.js"];
	for (const arquivo of runtime) {
		const texto = fs.readFileSync(path.join(RAIZ, arquivo), "utf8");
		for (const [, alvo] of texto.matchAll(/require\("(\.[^"]+)"\)/g)) {
			const relativo = path.relative(RAIZ, path.resolve(path.dirname(path.join(RAIZ, arquivo)), alvo)).replace(/\\/g, "/");
			assert.ok(runtime.includes(`${relativo}.js`) || runtime.includes(relativo), `${arquivo} → ${relativo}`);
		}
	}
	assert.deepEqual(Object.keys(pacote.dependencies), ["libxml2-wasm"]);
});

test("o README lista todo prefixo e segue as regras de texto", () => {
	const readme = fs.readFileSync(path.join(RAIZ, "README.md"), "utf8");
	for (const snippets of Object.values(ARQUIVOS)) for (const s of Object.values(snippets)) assert.ok(readme.includes(`\`${s.prefix}\``), s.prefix);
	for (const arquivo of ["README.md", "CHANGELOG.md", "NOTICE"]) {
		const texto = fs.readFileSync(path.join(RAIZ, arquivo), "utf8");
		assert.ok(!texto.includes("—"), `${arquivo}: travessão`);
		assert.doesNotMatch(texto, /\b(Claude|ChatGPT|Copilot|IA generativa)\b/, arquivo);
	}
	assert.match(readme, /_Hecho con amor y café por \[commente\.me\]\(https:\/\/commente\.me\)_/);
	assert.equal(pacote.displayName, "Snippets for Adobe Commerce");
	assert.equal(`${pacote.publisher}.${pacote.name}`, "commenteme.adobe-commerce-snippets");
});

test("a fonte da documentação está fixada em commits", () => {
	const fonte = JSON.parse(fs.readFileSync(path.join(RAIZ, "data/fonte.json"), "utf8"));
	assert.equal(fonte.fuentes.length, 4);
	for (const f of fonte.fuentes) assert.match(f.commit, /^[0-9a-f]{40}$/, f.repo);
});
