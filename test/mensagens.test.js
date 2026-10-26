// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { traduzir, intervalo, descartaveis } = require("../lib/mensagens");

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

const XSI_TYPE = "{http://www.w3.org/2001/XMLSchema-instance}type";

test("o xsi:type aparece como se escreve, na mensagem e no intervalo", () => {
	const original = `Element 'argument', attribute '${XSI_TYPE}': The QName value 'strin' of the xsi:type attribute does not resolve to a type definition.`;
	assert.equal(traduzir(original), "<argument>, atributo xsi:type: El xsi:type 'strin' no existe en este esquema.");
	const texto = '<config>\n\t<argument name="a" xsi:type="strin">x</argument>\n</config>';
	const r = intervalo(texto, 2, original);
	assert.equal(texto.slice(r.inicio, r.fim), "xsi:type");
	const outroPrefixo = '<config>\n\t<argument name="a" i:type="strin">x</argument>\n</config>';
	const o = intervalo(outroPrefixo, 2, original);
	assert.equal(outroPrefixo.slice(o.inicio, o.fim), "i:type", "vale o prefixo escrito");
	assert.equal(traduzir("Element 'a', attribute '{urn:x}b': The attribute '{urn:x}b' is not allowed."), "<a>, atributo b: El atributo '{urn:x}b' no está permitido.");
});

test("descartaveis tira o tipo abstrato que só repete o xsi:type inválido e os erros internos do libxml2", () => {
	const xsiRuim = `Element 'argument', attribute '${XSI_TYPE}': The QName value 'strin' of the xsi:type attribute does not resolve to a type definition.`;
	const abstrato = "Element 'argument': The type definition is abstract.";
	assert.deepEqual(
		descartaveis([
			{ linha: 5, mensagem: xsiRuim },
			{ linha: 5, mensagem: abstrato },
			{ linha: 7, mensagem: abstrato },
			{ linha: 4, mensagem: "Element 'arguments': Internal error: xmlSchemaXPathProcessHistory, The state object to be removed is not the first in the list." }
		]),
		[false, true, false, true],
		"sem xsi:type na linha 7, o abstrato é o único aviso e fica"
	);
});
