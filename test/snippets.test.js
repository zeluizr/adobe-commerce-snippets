// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { ARQUIVOS, gerarArquivo } = require("../lib/catalogo");
const { SNIPPETS_XML, ENVOLTORIOS } = require("../lib/snippets-xml");
const { SNIPPETS_JS } = require("../lib/snippets-front");
const { urnDoXml } = require("../lib/urn");
const { criarValidador } = require("../lib/validador");
const { resolver, camposBemFormados } = require("./auxiliares");
const { xsdDeTeste } = require("./xsd");

const RAIZ = path.join(__dirname, "..");
const TODOS = Object.values(ARQUIVOS).flatMap((s) => Object.entries(s));

/** O XML que o snippet gera com os valores padrão, já dentro do envoltório. */
function xmlDe(/** @type {import("../lib/snippets-xml").Snippet} */ s) {
	const texto = resolver(s.body);
	if (!s.envoltorio) return texto;
	const envolver = ENVOLTORIOS[s.envoltorio];
	assert.ok(envolver, `envoltorio ${s.envoltorio}`);
	return envolver(texto);
}

test("os arquivos gerados estão em dia", () => {
	for (const [nome, snippets] of Object.entries(ARQUIVOS)) {
		const gravado = JSON.parse(fs.readFileSync(path.join(RAIZ, `snippets/${nome}.code-snippets`), "utf8"));
		assert.deepEqual(gravado, gerarArquivo(snippets), `rode node scripts/gerar.js (${nome})`);
	}
});

test("todo snippet tem prefixo ac- único, campos bem formados e descrição com a página", () => {
	/** @type {Map<string, string>} */
	const vistos = new Map();
	for (const [nome, s] of TODOS) {
		assert.match(s.prefix, /^ac-[a-z0-9-]+$/, nome);
		assert.ok(!vistos.has(s.prefix), `prefixo ${s.prefix} em ${vistos.get(s.prefix)} e ${nome}`);
		vistos.set(s.prefix, nome);
		assert.ok(camposBemFormados(s.body), nome);
		assert.ok(s.descricao.length > 10 && !s.descricao.includes("—"), nome);
		assert.match(s.pagina, /^commerce-(php|frontend-core|webapi|operations\.en)\/.+\.md$/, nome);
	}
});

test("as páginas citadas existem nas fontes (ADOBE_COMMERCE_DOCS)", { skip: !process.env.ADOBE_COMMERCE_DOCS }, () => {
	const fontes = path.resolve(String(process.env.ADOBE_COMMERCE_DOCS));
	for (const [nome, s] of TODOS) assert.ok(fs.existsSync(path.join(fontes, s.pagina)), `${nome}: ${s.pagina}`);
});

test("todo snippet de XML gera XML bem formado com URN do Magento", async () => {
	const { XmlDocument } = await import("libxml2-wasm");
	for (const [nome, s] of Object.entries(SNIPPETS_XML)) {
		const texto = xmlDe(s);
		assert.ok(urnDoXml(texto), `${nome}: sem URN`);
		const doc = XmlDocument.fromString(texto);
		doc.dispose();
	}
});

test("todo snippet de XML é válido contra o XSD do magento2", async (t) => {
	const xsd = await xsdDeTeste();
	if (!xsd) return t.skip("sin red para bajar los XSD");
	const v = criarValidador();
	t.after(() => v.encerrar());
	const arquivo = path.join(xsd.vendor, "app/code/Vendor/Module/etc/exemplo.xml");
	for (const [nome, s] of Object.entries(SNIPPETS_XML)) {
		const r = await v.validar(arquivo, xmlDe(s));
		assert.equal(r.motivo, undefined, `${nome}: ${r.motivo}`);
		assert.ok(r.xsd, nome);
		assert.deepEqual(r.problemas, [], nome);
	}
});

test("todo snippet de JavaScript é JavaScript válido", () => {
	for (const [nome, s] of Object.entries(SNIPPETS_JS)) {
		const texto = resolver(s.body);
		const codigo = s.envoltorio === "objeto" ? `({\n${texto}\n})` : texto;
		assert.doesNotThrow(() => new vm.Script(codigo), nome);
	}
});

/**
 * Confere que (), [] e {} fecham na ordem, fora de strings e comentários.
 * @param {string} codigo
 */
function balanceado(codigo) {
	const pares = { ")": "(", "]": "[", "}": "{" };
	/** @type {string[]} */
	const pilha = [];
	const limpo = codigo
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/(^|[^:])\/\/.*$/gm, "$1")
		.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g, "''");
	for (const c of limpo) {
		if ("([{".includes(c)) pilha.push(c);
		else if (c in pares && pilha.pop() !== pares[/** @type {")"|"]"|"}"} */ (c)]) return false;
	}
	return pilha.length === 0;
}

test("os snippets de PHP, phtml e GraphQL fecham parênteses e chaves", () => {
	for (const nome of ["php", "phtml", "graphql"]) {
		for (const [chave, s] of Object.entries(ARQUIVOS[/** @type {"php"} */ (nome)])) {
			const texto = resolver(s.body);
			assert.ok(balanceado(texto), `${nome}: ${chave}`);
			if (nome === "php" && texto.startsWith("<?php")) {
				assert.match(texto, /declare\(strict_types=1\);/, chave);
				assert.doesNotMatch(texto, /\\\\/, `${chave}: barra dupla`);
			}
		}
	}
});

test("as barras invertidas dos namespaces chegam simples ao editor", () => {
	const { SNIPPETS_PHP } = require("../lib/snippets-php");
	const texto = resolver(SNIPPETS_PHP["plugin: clase"].body);
	assert.match(texto, /^namespace Vendor\\Module\\Plugin;$/m);
	assert.match(texto, /\$subject, \$result/);
	const { SNIPPETS_GRAPHQL } = require("../lib/snippets-front");
	assert.match(resolver(SNIPPETS_GRAPHQL["schema.graphqls: query"].body), /class: "\\\\Vendor\\\\Module\\\\Model\\\\Resolver\\\\Example"/);
});
