// @ts-check
"use strict";

// De onde veio cada snippet: o caminho da página no repositório de documentação
// (fixado em data/fonte.json) vira a URL pública. Lógica pura, sem `vscode`.

const fonte = require("../data/fonte.json");

/**
 * URL pública de uma página citada como `<repo>/<caminho>.md`, por exemplo
 * `commerce-php/src/pages/development/components/plugins.md`.
 * @param {string} pagina
 */
function urlDaPagina(pagina) {
	const [repo, ...resto] = pagina.split("/");
	const origem = fonte.fuentes.find((f) => f.repo === repo);
	if (!origem) throw new Error(`fuente desconocida: ${pagina}`);
	let caminho = resto.join("/");
	if (!caminho.startsWith(`${origem.raizPaginas}/`)) throw new Error(`fuera de ${origem.raizPaginas}: ${pagina}`);
	caminho = caminho.slice(origem.raizPaginas.length + 1).replace(/\.md$/, "");
	caminho = caminho === "index" ? "" : caminho.replace(/\/index$/, "/");
	const rotas = /** @type {Record<string, string>} */ (origem.rutasPublicadas || {});
	const prefixo = Object.keys(rotas)
		.filter((p) => caminho.startsWith(p))
		.sort((a, b) => b.length - a.length)[0];
	if (prefixo) caminho = rotas[prefixo] + caminho.slice(prefixo.length);
	return origem.sitio + caminho;
}

module.exports = { urlDaPagina };
