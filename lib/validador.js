// @ts-check
"use strict";

// Validação XSD dos XML do Adobe Commerce com o libxml2 compilado em WebAssembly
// (libxml2-wasm). Os XSD nunca vêm no pacote: são lidos do projeto aberto, pela
// URN declarada no próprio XML, e cada `xs:include`/`xs:redefine` com URN dentro
// deles é resolvido pelo mesmo caminho, com um input provider registrado no
// libxml2. É o mesmo mecanismo que o Magento usa (commerce-php,
// development/build/schema-validation.md: o UrnResolver registrado com
// libxml_set_external_entity_loader).
//
// Sem `vscode`: o extension.js chama `validar()` e converte o resultado.
//
// Regra de ouro: sem XSD, sem diagnóstico. Se a raiz do projeto, o componente ou
// algum XSD incluído não for encontrado, o resultado vem sem problemas e com o
// motivo, que o extension.js escreve no output channel.

const fs = require("fs");
const path = require("path");
const { resolverUrn, urnDoXml } = require("./urn");
const { acharRaiz, lerComponentes } = require("./componentes");
const { traduzir, intervalo, descartaveis } = require("./mensagens");

/**
 * @typedef {{ inicio: number, fim: number, mensagem: string, severidade: "erro" | "aviso" }} Problema
 * @typedef {{ problemas: Problema[], motivo?: string, xsd?: string }} Resultado
 * @typedef {import("./urn").Componentes} Componentes
 * @typedef {{ validador: any, documento: any, arquivos: Map<string, number> }} Compilado
 */

/** @type {Promise<any> | null} */
let carregando = null;

// Contexto do input provider. A compilação do XSD é síncrona dentro do
// libxml2, então basta apontar estas variáveis antes de compilar.
/** @type {Componentes | null} */
let componentesAtuais = null;
/** @type {Map<string, number> | null} */
let lidosAtuais = null;
/** @type {Map<number, { dados: Buffer, posicao: number }>} */
const abertos = new Map();
let proximo = 1;

/** Carrega o libxml2-wasm uma vez só. É ESM, então entra por import(). */
function libxml() {
	if (!carregando) {
		carregando = import("libxml2-wasm").then((lib) => {
			lib.xmlRegisterInputProvider({
				match: (/** @type {string} */ nome) => nome.startsWith("urn:magento:"),
				open: (/** @type {string} */ nome) => {
					if (!componentesAtuais) return undefined;
					const arquivo = resolverUrn(nome, componentesAtuais);
					if (!arquivo) return undefined;
					try {
						const dados = fs.readFileSync(arquivo);
						lidosAtuais?.set(arquivo, fs.statSync(arquivo).mtimeMs);
						const fd = proximo++;
						abertos.set(fd, { dados, posicao: 0 });
						return fd;
					} catch {
						return undefined;
					}
				},
				read: (/** @type {number} */ fd, /** @type {Uint8Array} */ buffer) => {
					const aberto = abertos.get(fd);
					if (!aberto) return -1;
					const n = Math.min(buffer.byteLength, aberto.dados.length - aberto.posicao);
					buffer.set(aberto.dados.subarray(aberto.posicao, aberto.posicao + n));
					aberto.posicao += n;
					return n;
				},
				close: (/** @type {number} */ fd) => abertos.delete(fd)
			});
			return lib;
		});
	}
	return carregando;
}

/** @param {Map<string, number>} arquivos */
function mudou(arquivos) {
	for (const [arquivo, mtime] of arquivos) {
		try {
			if (fs.statSync(arquivo).mtimeMs !== mtime) return true;
		} catch {
			return true;
		}
	}
	return false;
}

/**
 * Detalhes de erro do libxml2-wasm em problemas do documento.
 * @param {string} texto
 * @param {any[]} detalhes
 * @param {string} nome o `url` dado ao documento
 */
function problemasDe(texto, detalhes, nome) {
	/** @type {Problema[]} */
	const saida = [];
	const vistos = new Set();
	const doDocumento = (detalhes || [])
		.filter((d) => !d.file || d.file === nome)
		.map((d) => ({ linha: Math.max(1, Number(d.line) || 1), mensagem: String(d.message || "").trim(), nivel: d.level }));
	const descartar = descartaveis(doDocumento);
	for (const [i, d] of doDocumento.entries()) {
		const { linha, mensagem } = d;
		const chave = `${linha}:${mensagem}`;
		if (!mensagem || descartar[i] || vistos.has(chave)) continue;
		vistos.add(chave);
		const { inicio, fim } = intervalo(texto, linha, mensagem);
		saida.push({ inicio, fim, mensagem: traduzir(mensagem), severidade: d.nivel === 1 ? "aviso" : "erro" });
	}
	return saida;
}

function criarValidador() {
	/** @type {Map<string, string | null>} */
	const raizes = new Map();
	/** @type {Map<string, Componentes>} */
	const componentes = new Map();
	/** @type {Map<string, Compilado>} */
	const compilados = new Map();

	/** @param {string} arquivo */
	function raizDe(arquivo) {
		const pasta = path.dirname(path.resolve(arquivo));
		if (!raizes.has(pasta)) raizes.set(pasta, acharRaiz(arquivo));
		return raizes.get(pasta) ?? null;
	}

	/** @param {string} raiz */
	function componentesDe(raiz) {
		let c = componentes.get(raiz);
		if (!c) {
			c = lerComponentes(raiz);
			componentes.set(raiz, c);
		}
		return c;
	}

	/** @param {Compilado} c */
	function descartar(c) {
		try {
			c.validador.dispose();
		} catch {}
		try {
			c.documento.dispose();
		} catch {}
	}

	/**
	 * @param {any} lib
	 * @param {string} urn
	 * @param {string} xsd
	 * @param {Componentes} comps
	 * @returns {Compilado | string}
	 */
	function compilar(lib, urn, xsd, comps) {
		const chave = `${xsd}\n${urn}`;
		const guardado = compilados.get(chave);
		if (guardado && !mudou(guardado.arquivos)) return guardado;
		if (guardado) {
			descartar(guardado);
			compilados.delete(chave);
		}
		/** @type {Map<string, number>} */
		const arquivos = new Map();
		componentesAtuais = comps;
		lidosAtuais = arquivos;
		let documento;
		try {
			arquivos.set(xsd, fs.statSync(xsd).mtimeMs);
			documento = lib.XmlDocument.fromBuffer(fs.readFileSync(xsd), { url: urn });
			const validador = lib.XsdValidator.fromDoc(documento);
			const compilado = { validador, documento, arquivos };
			compilados.set(chave, compilado);
			return compilado;
		} catch (erro) {
			try {
				documento?.dispose();
			} catch {}
			const detalhe = /** @type {any} */ (erro)?.details?.[0]?.message || /** @type {any} */ (erro)?.message || String(erro);
			return `no se pudo compilar ${xsd}: ${String(detalhe).trim()}`;
		} finally {
			componentesAtuais = null;
			lidosAtuais = null;
		}
	}

	/**
	 * Valida o texto de um XML. `arquivo` é o caminho no disco, usado só para achar a
	 * raiz do projeto (o texto pode ter mudanças ainda não salvas).
	 * @param {string} arquivo
	 * @param {string} texto
	 * @returns {Promise<Resultado>}
	 */
	async function validar(arquivo, texto) {
		const declarada = urnDoXml(texto);
		if (!declarada) return { problemas: [] };
		const raiz = raizDe(arquivo);
		if (!raiz) return { problemas: [], motivo: `sin raíz de proyecto para ${arquivo}` };
		const comps = componentesDe(raiz);
		const xsd = resolverUrn(declarada.urn, comps);
		if (!xsd || !fs.existsSync(xsd)) return { problemas: [], motivo: `XSD no encontrado para ${declarada.urn} en ${raiz}` };
		const lib = await libxml();
		const compilado = compilar(lib, declarada.urn, xsd, comps);
		if (typeof compilado === "string") return { problemas: [], motivo: compilado, xsd };
		const nome = "documento.xml";
		let documento;
		try {
			documento = lib.XmlDocument.fromString(texto, { url: nome });
		} catch (erro) {
			return { problemas: problemasDe(texto, /** @type {any} */ (erro)?.details, nome), xsd };
		}
		try {
			compilado.validador.validate(documento);
			return { problemas: [], xsd };
		} catch (erro) {
			const detalhes = /** @type {any} */ (erro)?.details;
			if (!detalhes) return { problemas: [], motivo: String(/** @type {any} */ (erro)?.message || erro), xsd };
			return { problemas: problemasDe(texto, detalhes, nome), xsd };
		} finally {
			documento.dispose();
		}
	}

	/** Esquece raízes e componentes (um registration.php mudou ou o Composer rodou). */
	function esquecer() {
		raizes.clear();
		componentes.clear();
	}

	function encerrar() {
		for (const c of compilados.values()) descartar(c);
		compilados.clear();
		esquecer();
	}

	return { validar, esquecer, encerrar };
}

module.exports = { criarValidador };
