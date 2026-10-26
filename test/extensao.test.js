// @ts-check
"use strict";

// O extension.js com um `vscode` falso: abre um XML inválido e confere que o
// diagnóstico chega à coleção, com a posição convertida e a fonte certa, e
// que uma rajada de registration.php mudados vira uma releitura só.

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
	/** @type {Function[]} */
	const observadores = [];
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
			createFileSystemWatcher: () => {
				const ouvir = (/** @type {Function} */ f) => observadores.push(f);
				return { onDidCreate: ouvir, onDidChange: ouvir, onDidDelete: ouvir, dispose() {} };
			},
			onDidOpenTextDocument: ouvir("abrir"),
			onDidSaveTextDocument: ouvir("salvar"),
			onDidChangeTextDocument: ouvir("mudar"),
			onDidCloseTextDocument: ouvir("fechar"),
			onDidChangeConfiguration: ouvir("config")
		}
	};
	return { vscode, diagnosticos, ouvintes, observadores };
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

/**
 * Carrega o extension.js com o `vscode` falso. Cada chamada lê o módulo de novo.
 * @param {any} vscode
 */
function carregarExtensao(vscode) {
	const carregar = /** @type {any} */ (Module)._load;
	/** @type {any} */ (Module)._load = function (/** @type {string} */ pedido, /** @type {any[]} */ ...resto) {
		return pedido === "vscode" ? vscode : carregar.call(this, pedido, ...resto);
	};
	try {
		delete require.cache[require.resolve("../extension")];
		return require("../extension");
	} finally {
		/** @type {any} */ (Module)._load = carregar;
	}
}

test("activate valida o XML aberto e publica o diagnóstico", async () => {
	const { vscode, diagnosticos, ouvintes } = vscodeFalso();
	{
		const extensao = carregarExtensao(vscode);
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
	}
});

test("uma rajada de registration.php mudados relê os componentes uma vez só", async (t) => {
	const { vscode, observadores } = vscodeFalso();
	const arquivo = path.join(PROJETO, "app/code/Exemplo/Teste/etc/teste.xml");
	const doc = documento(arquivo, `<?xml version="1.0"?>\n<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="urn:magento:module:Exemplo_Teste:etc/teste.xsd"/>\n`);
	let leituras = 0;
	const getText = doc.getText;
	doc.getText = () => {
		leituras++;
		return getText();
	};
	vscode.workspace.textDocuments = [doc];
	t.mock.timers.enable({ apis: ["setTimeout"] });
	const extensao = carregarExtensao(vscode);
	/** @type {{ dispose: Function }[]} */
	const subscriptions = [];
	extensao.activate({ subscriptions });
	t.after(() => subscriptions.forEach((s) => s.dispose()));
	assert.equal(leituras, 1, "a validação inicial");
	assert.ok(observadores.length >= 3);
	for (let i = 0; i < 300; i++) observadores[i % observadores.length]({ fsPath: `/p/vendor/v${i}/registration.php` });
	t.mock.timers.tick(999);
	assert.equal(leituras, 1, "nada durante a rajada");
	t.mock.timers.tick(1);
	assert.equal(leituras, 2, "uma revalidação ao fim da rajada");
	t.mock.timers.tick(5000);
	assert.equal(leituras, 2);
});
