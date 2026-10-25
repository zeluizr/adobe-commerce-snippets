// @ts-check
"use strict";

// Converte os erros do libxml2 em diagnósticos: a mensagem em espanhol e o
// intervalo no texto (o libxml2 só dá a linha). Lógica pura, sem `vscode`.

/** @type {[RegExp, (...g: string[]) => string][]} */
const TRADUCOES = [
	[/^The attribute '([^']+)' is not allowed\.$/, (a) => `El atributo '${a}' no está permitido.`],
	[/^The attribute '([^']+)' is required but missing\.$/, (a) => `Falta el atributo obligatorio '${a}'.`],
	[/^This element is not expected\. Expected is one of \( (.+) \)\.$/, (e) => `Este elemento no se esperaba aquí. Se esperaba uno de: ${e}.`],
	[/^This element is not expected\. Expected is \( (.+) \)\.$/, (e) => `Este elemento no se esperaba aquí. Se esperaba: ${e}.`],
	[/^This element is not expected\.$/, () => "Este elemento no se esperaba aquí."],
	[/^Missing child element\(s\)\. Expected is one of \( (.+) \)\.$/, (e) => `Faltan elementos hijos. Se esperaba uno de: ${e}.`],
	[/^Missing child element\(s\)\. Expected is \( (.+) \)\.$/, (e) => `Faltan elementos hijos. Se esperaba: ${e}.`],
	[/^\[facet 'enumeration'\] The value '([^']*)' is not an element of the set \{(.+)\}\.$/, (v, c) => `El valor '${v}' no está entre los permitidos: ${c}.`],
	[/^\[facet 'pattern'\] The value '([^']*)' is not accepted by the pattern '(.+)'\.$/, (v, p) => `El valor '${v}' no cumple el patrón '${p}'.`],
	[/^\[facet '(minLength|maxLength|length)'\] The value '([^']*)' has a length of '(\d+)'; this (?:underruns|exceeds|differs from) the allowed (?:minimum |maximum )?length of '(\d+)'\.$/, (_f, v, l, n) => `El valor '${v}' tiene ${l} caracteres y el límite es ${n}.`],
	[/^'([^']*)' is not a valid value of the (?:atomic|union|list) type '([^']+)'\.$/, (v, t) => `'${v}' no es un valor válido del tipo '${t}'.`],
	[/^'([^']*)' is not a valid value of the local (?:atomic|union|list) type\.$/, (v) => `'${v}' no es un valor válido para este campo.`],
	[/^Duplicate key-sequence \[(.+)\] in (?:unique|key) identity-constraint '([^']+)'\.$/, (k, c) => `Valor repetido [${k}]: la restricción '${c}' exige que sea único.`],
	[/^No match found for key-sequence \[(.+)\] of keyref '([^']+)'\.$/, (k, c) => `[${k}] no corresponde a ningún valor declarado (referencia '${c}').`],
	[/^Character content other than whitespace is not allowed because the content type is 'element-only'\.$/, () => "Este elemento solo admite elementos hijos, no texto."],
	[/^Element content is not allowed, because the content type is a simple type definition\.$/, () => "Este elemento solo admite texto, no elementos hijos."],
	[/^No matching global declaration available for the validation root\.$/, () => "El elemento raíz no corresponde al esquema declarado."],
	[/^The type definition is abstract\.$/, () => "El tipo es abstracto: falta un xsi:type concreto."],
	[/^The QName value '([^']+)' of the xsi:type attribute does not resolve to a type definition\.$/, (t) => `El xsi:type '${t}' no existe en este esquema.`],
	[/^The type definition '([^']+)', specified by xsi:type, is blocked or not validly derived from the type definition of the element declaration\.$/, (t) => `El xsi:type '${t}' no se puede usar en este elemento.`],
	[/^Opening and ending tag mismatch: (\S+) line (\d+) and (\S+)$/, (a, l, b) => `La etiqueta de cierre </${b}> no corresponde a <${a}> de la línea ${l}.`],
	[/^Premature end of data in tag (\S+) line (\d+)$/, (a, l) => `El archivo termina antes de cerrar <${a}> de la línea ${l}.`],
	[/^EndTag: '<\/' not found$/, () => "Falta la etiqueta de cierre."],
	[/^Extra content at the end of the document$/, () => "Hay contenido después del elemento raíz."],
	[/^Attribute (\S+) redefined$/, (a) => `El atributo ${a} está repetido.`],
	[/^Couldn't find end of Start Tag (\S+) line (\d+)$/, (a, l) => `La etiqueta <${a}> de la línea ${l} no está cerrada.`],
	[/^AttValue: " or ' expected$/, () => "Falta la comilla del valor del atributo."],
	[/^attributes construct error$/, () => "Atributo mal formado."],
	[/^Namespace prefix (\S+) for (\S+) on (\S+) is not defined$/, (p, a, e) => `El prefijo ${p} de ${a} en <${e}> no está declarado (falta xmlns:${p}).`],
	[/^Start tag expected, '<' not found$/, () => "El documento no empieza con un elemento."],
	[/^Document is empty$/, () => "El documento está vacío."]
];

/**
 * Traduz uma mensagem do libxml2. O prefixo `Element 'x', attribute 'y': ` vira
 * `<x> y: `. O que não se conhece fica em inglês, como veio.
 * @param {string} original
 */
function traduzir(original) {
	let texto = original.trim();
	let prefixo = "";
	const sujeito = /^Element '([^']+)'(?:, attribute '([^']+)')?: /.exec(texto);
	if (sujeito) {
		prefixo = `<${sujeito[1]}>${sujeito[2] ? `, atributo ${sujeito[2]}` : ""}: `;
		texto = texto.slice(sujeito[0].length);
	}
	for (const [padrao, montar] of TRADUCOES) {
		const m = padrao.exec(texto);
		if (m) return prefixo + montar(...m.slice(1));
	}
	return prefixo + texto;
}

/**
 * O que a mensagem acusa: o atributo (se houver) e o elemento.
 * @param {string} original
 */
function alvo(original) {
	const m = /^Element '([^']+)'(?:, attribute '([^']+)')?/.exec(original.trim());
	return { elemento: m ? m[1] : null, atributo: m && m[2] ? m[2] : null };
}

/**
 * Intervalo [inicio, fim) no texto para um erro da `linha` (1 em diante). Procura
 * o atributo, depois a tag de abertura do elemento e, sem nada disso, pega a linha
 * inteira sem o recuo.
 * @param {string} texto
 * @param {number} linha
 * @param {string} mensagem a mensagem original, em inglês
 */
function intervalo(texto, linha, mensagem) {
	let inicioLinha = 0;
	for (let n = 1; n < linha; n++) {
		const p = texto.indexOf("\n", inicioLinha);
		if (p < 0) break;
		inicioLinha = p + 1;
	}
	let fimLinha = texto.indexOf("\n", inicioLinha);
	if (fimLinha < 0) fimLinha = texto.length;
	const conteudo = texto.slice(inicioLinha, fimLinha);
	const { elemento, atributo } = alvo(mensagem);
	const nomeLocal = elemento ? elemento.replace(/^\{[^}]*\}/, "") : null;
	const tag = nomeLocal ? new RegExp(`<(?:[\\w.-]+:)?${escapar(nomeLocal)}(?=[\\s/>]|$)`).exec(conteudo) : null;
	if (atributo) {
		const desde = tag ? tag.index : 0;
		const attr = new RegExp(`(^|\\s)(${escapar(atributo)})\\s*=`).exec(conteudo.slice(desde));
		if (attr) {
			const ini = inicioLinha + desde + attr.index + attr[1].length;
			return { inicio: ini, fim: ini + atributo.length };
		}
	}
	if (tag) return { inicio: inicioLinha + tag.index + 1, fim: inicioLinha + tag.index + tag[0].length };
	const recuo = conteudo.length - conteudo.trimStart().length;
	const fim = Math.max(inicioLinha + recuo + 1, inicioLinha + conteudo.trimEnd().length);
	return { inicio: inicioLinha + recuo, fim: Math.min(fim, texto.length) };
}

/** @param {string} s */
function escapar(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { traduzir, intervalo };
