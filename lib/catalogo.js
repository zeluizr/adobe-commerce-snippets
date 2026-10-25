// @ts-check
"use strict";

// Junta os snippets de lib/snippets-*.js por arquivo gerado e monta o formato do
// VS Code. Lógica pura, sem `vscode`.

const { SNIPPETS_XML } = require("./snippets-xml");
const { SNIPPETS_PHP } = require("./snippets-php");
const { SNIPPETS_PHTML, SNIPPETS_JS, SNIPPETS_GRAPHQL } = require("./snippets-front");
const { urlDaPagina } = require("./fontes");

/** @typedef {import("./snippets-xml").Snippet} Snippet */

/** Cada arquivo de snippets/ e o que vai nele. */
const ARQUIVOS = {
	xml: SNIPPETS_XML,
	php: SNIPPETS_PHP,
	phtml: SNIPPETS_PHTML,
	javascript: SNIPPETS_JS,
	graphql: SNIPPETS_GRAPHQL
};

/**
 * O snippet no formato do VS Code: a descrição leva a URL da página de onde veio.
 * @param {Snippet} s
 */
function paraVsCode(s) {
	return { prefix: s.prefix, body: s.body, description: `${s.descricao}\n${urlDaPagina(s.pagina)}` };
}

/** @param {Record<string, Snippet>} snippets */
function gerarArquivo(snippets) {
	/** @type {Record<string, ReturnType<typeof paraVsCode>>} */
	const saida = {};
	for (const [nome, s] of Object.entries(snippets)) saida[nome] = paraVsCode(s);
	return saida;
}

module.exports = { ARQUIVOS, gerarArquivo, paraVsCode };
