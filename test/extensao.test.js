// @ts-check
"use strict";

// O extension.js com um `vscode` falso: abre um XML inválido e confere que o
// diagnóstico chega à coleção, com a posição convertida e a fonte certa.

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const Module = require("module");

const PROJETO = path.join(__dirname, "fixtures", "projeto");

function vscodeFalso() {
	/** @type {Map<string, any[]>} */
	const diagnosticos = new Map();
	/** @type {Record<string, Function[]>} */
	const ouvintes = {};
	const ouvir = (/** @type {string} */ nome) => (/** @type {Function} */ f) => {
		(ouvintes[nome] ||= []).push(f);
		return { dispose() {} };
	};
	class Range {
		/** @param {any} a @param {any} b */
		constructor(a, b) {
			this.start = a;
			this.end = b;
		}
	}
	class Diagnostic {
		/** @param {any} r @param {string} m @param {number} s */
		constructor(r, m, s) {
			this.range = r;
			this.message = m;
			this.severity = s;
			this.source = "";
		}
	}
	const vscode = {
		Range,
		Diagnostic,
		DiagnosticSeverity: { Error: 0, Warning: 1 },
		languages: {
			createDiagnosticCollection: () => ({
				set: (/** @type {any} */ uri, /** @type {any[]} */ d) => diagnosticos.set(uri.toString(), d),
				delete: (/** @type {any} */ uri) => diagnosticos.delete(uri.toString()),
				dispose() {}
			})
		},
		window: { createOutputChannel: () => ({ appendLine() {}, dispose() {} }) },
		workspace: {
			textDocuments: /** @type {any[]} */ ([]),
			getConfiguration: () => ({ get: (/** @type {string} */ _k, /** @type {any} */ padrao) => padrao }),
			createFileSystemWatcher: () => ({ onDidCreate() {}, onDidChange() {}, onDidDelete() {}, dispose() {} }),
			onDidOpenTextDocument: ouvir("abrir"),
			onDidSaveTextDocument: ouvir("salvar"),
			onDidChangeTextDocument: ouvir("mudar"),
			onDidCloseTextDocument: ouvir("fechar"),
			onDidChangeConfiguration: ouvir("config")
		}
	};
	return { vscode, diagnosticos, ouvintes };
}

/** @param {string} arquivo @param {string} texto */
function documento(arquivo, texto) {
	return {
		languageId: "xml",
		version: 1,
		isClosed: false,
		uri: { scheme: "file", fsPath: arquivo, toString: () => `file://${arquivo}` },
		getText: () => texto,
		positionAt: (/** @type {number} */ offset) => {
			const antes = texto.slice(0, offset).split("\n");
			return { line: antes.length - 1, character: antes[antes.length - 1].length };
		}
	};
}

test("activate valida o XML aberto e publica o diagnóstico", async () => {
	const { vscode, diagnosticos, ouvintes } = vscodeFalso();
	const carregar = /** @type {any} */ (Module)._load;
	/** @type {any} */ (Module)._load = function (/** @type {string} */ pedido, /** @type {any[]} */ ...resto) {
		return pedido === "vscode" ? vscode : carregar.call(this, pedido, ...resto);
	};
	try {
		const extensao = require("../extension");
		/** @type {{ dispose: Function }[]} */
		const subscriptions = [];
		extensao.activate({ subscriptions });
		const arquivo = path.join(PROJETO, "app/code/Exemplo/Teste/etc/teste.xml");
		const texto = `<?xml version="1.0"?>\n<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="urn:magento:module:Exemplo_Teste:etc/teste.xsd">\n\t<item nome="a"/>\n</config>\n`;
		await ouvintes.abrir[0](documento(arquivo, texto));
		const lista = diagnosticos.get(`file://${arquivo}`) || [];
		assert.equal(lista.length, 2, JSON.stringify(lista));
		assert.ok(lista.every((d) => d.source === "Snippets for Adobe Commerce"));
		assert.deepEqual(lista[0].range.start, { line: 2, character: 7 });
		for (const s of subscriptions) s.dispose();
	} finally {
		/** @type {any} */ (Module)._load = carregar;
	}
});
