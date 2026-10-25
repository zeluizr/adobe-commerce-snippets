// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { traduzir, intervalo } = require("../lib/mensagens");

test("traduzir põe em espanhol as mensagens conhecidas do libxml2", () => {
	assert.equal(
		traduzir("Element 'preference', attribute 'fr': The attribute 'fr' is not allowed.\n"),
		"<preference>, atributo fr: El atributo 'fr' no está permitido."
	);
	assert.equal(traduzir("Element 'preference': The attribute 'for' is required but missing."), "<preference>: Falta el atributo obligatorio 'for'.");
	assert.equal(
		traduzir("Element 'tipo': This element is not expected. Expected is one of ( preference, type, virtualType )."),
		"<tipo>: Este elemento no se esperaba aquí. Se esperaba uno de: preference, type, virtualType."
	);
	assert.equal(
		traduzir("Element 'column', attribute 'onDelete': [facet 'enumeration'] The value 'x' is not an element of the set {'CASCADE', 'SET NULL', 'NO ACTION'}."),
		"<column>, atributo onDelete: El valor 'x' no está entre los permitidos: 'CASCADE', 'SET NULL', 'NO ACTION'."
	);
	assert.equal(traduzir("Opening and ending tag mismatch: item line 3 and config"), "La etiqueta de cierre </config> no corresponde a <item> de la línea 3.");
	assert.equal(traduzir("Algo que no se conoce."), "Algo que no se conoce.", "o desconhecido fica como veio");
});

test("intervalo marca o atributo, a tag ou a linha", () => {
	const texto = '<config>\n    <preference fr="A" type="B"/>\n    texto suelto\n</config>';
	const a = intervalo(texto, 2, "Element 'preference', attribute 'fr': The attribute 'fr' is not allowed.");
	assert.equal(texto.slice(a.inicio, a.fim), "fr");
	const e = intervalo(texto, 2, "Element 'preference': The attribute 'for' is required but missing.");
	assert.equal(texto.slice(e.inicio, e.fim), "preference");
	const l = intervalo(texto, 3, "Premature end of data in tag config line 1");
	assert.equal(texto.slice(l.inicio, l.fim), "texto suelto");
	const fora = intervalo(texto, 99, "x");
	assert.ok(fora.inicio <= texto.length && fora.fim <= texto.length);
});

test("intervalo não confunde um atributo com outro que termina igual", () => {
	const texto = '<job name="a" instance="B" xname="c"/>';
	const r = intervalo(texto, 1, "Element 'job', attribute 'name': The attribute 'name' is not allowed.");
	assert.equal(r.inicio, 5);
});
