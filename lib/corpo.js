// @ts-check
"use strict";

// Escreve o corpo de um snippet como texto legível e o converte na gramática do
// VS Code. Assim os snippets em lib/ se leem como o código que inserem, com as
// barras invertidas de namespace e os `$` de PHP como são. Lógica pura.
//
// Convenções do texto de entrada:
//   #{1:valor}  vira o campo ${1:valor}; #{1|a,b|} vira a escolha ${1|a,b|}
//   $0, $1...   são tabstops, como no VS Code
//   todo outro `$` é literal (variável de PHP, jQuery) e sai escapado
//   o recuo comum das linhas some, e o recuo restante deve ser de tab

/**
 * @param {string} texto
 * @returns {string[]}
 */
function corpo(texto) {
	const linhas = texto.replace(/^\n/, "").replace(/\n[\t ]*$/, "").split("\n");
	const recuos = linhas.filter((l) => l.trim()).map((l) => /^\t*/.exec(l)?.[0].length ?? 0);
	const comum = recuos.length ? Math.min(...recuos) : 0;
	return linhas.map((linha) =>
		linha
			.slice(Math.min(comum, /^\t*/.exec(linha)?.[0].length ?? 0))
			.replace(/\\(?=[\\$}]|#\{)/g, "\\\\")
			.replace(/\$(?!\d)/g, "\\$")
			.replace(/#\{/g, "${")
	);
}

module.exports = { corpo };
