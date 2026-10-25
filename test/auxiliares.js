// @ts-check
"use strict";

// Utilidades dos testes: resolver um corpo de snippet no texto que o VS Code
// inseriria se a pessoa aceitasse todos os valores padrão.

/**
 * `${1:texto}` vira `texto`, `${1|a,b|}` vira `a`, `$1`/`$0` somem e os escapes `\$`, `\}` e `\\` voltam
 * ao caractere. Campos aninhados são resolvidos de dentro para fora.
 * @param {string[]} corpo
 */
function resolver(corpo) {
	let texto = corpo.join("\n");
	const marcas = { "\\\\": "\u0001", "\\$": "\u0002", "\\}": "\u0003" };
	for (const [de, para] of Object.entries(marcas)) texto = texto.split(de).join(para);
	let anterior;
	do {
		anterior = texto;
		texto = texto.replace(/\$\{\d+:([^${}]*)\}/g, "$1").replace(/\$\{\d+\|([^,|]*)[^|]*\|\}/g, "$1");
	} while (texto !== anterior);
	texto = texto.replace(/\$\{\d+\}/g, "").replace(/\$\d+/g, "");
	return texto.split("\u0001").join("\\").split("\u0002").join("$").split("\u0003").join("}");
}

/**
 * Confere a gramática mínima de um corpo de snippet: todo `${` fecha e todo `$`
 * solto é seguido de número ou `{`.
 * @param {string[]} corpo
 */
function camposBemFormados(corpo) {
	const texto = corpo.join("\n").replace(/\\[\\$}]/g, "");
	let profundidade = 0;
	for (let i = 0; i < texto.length; i++) {
		if (texto[i] === "$") {
			if (texto[i + 1] === "{") {
				profundidade++;
				i++;
			} else if (!/\d/.test(texto[i + 1] || "")) return false;
		} else if (texto[i] === "}" && profundidade > 0) profundidade--;
	}
	return profundidade === 0;
}

module.exports = { resolver, camposBemFormados };
