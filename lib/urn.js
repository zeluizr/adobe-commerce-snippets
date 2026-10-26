// @ts-check
"use strict";

// Resolução das URNs `urn:magento:...` dos XML e dos XSD para arquivos do projeto
// aberto no VS Code. Lógica pura, sem `vscode` e sem disco: quem lê o disco é
// lib/componentes.js, que monta o mapa de componentes usado aqui.
//
// As regras vêm da documentação:
// - commerce-php, development/build/schema-validation.md: há dois tipos de
//   referência, `urn:magento:module:<Vendor_Module>:<caminho>` (o nome do módulo
//   é exatamente o registrado pelo ComponentRegistrar no registration.php, e o
//   caminho é relativo à pasta do módulo) e `urn:magento:framework:<caminho>`
//   (relativo à pasta do framework); bibliotecas adicionais do framework entram
//   como `framework-<subnome>`. Dentro de um XSD também se usa URN, nunca
//   caminho relativo.
// - commerce-php, development/build/component-registration.md: módulos se
//   registram com ComponentRegistrar::MODULE e o nome `Vendor_Module`;
//   bibliotecas com ComponentRegistrar::LIBRARY e o nome `<vendor>/<biblioteca>`
//   (o exemplo é `magento/framework`).
// Conferido no magento/magento2 2.4.9: o framework registra a biblioteca
// `magento/framework` e as subbibliotecas `magento/framework-amqp`,
// `magento/framework-bulk`, `magento/framework-message-queue` e
// `magento/framework-stomp`, e os XSD usam `urn:magento:framework-message-queue:`.
// Então `framework` resolve para a biblioteca `magento/framework` e
// `framework-<x>` para a biblioteca `magento/framework-<x>`.

const path = require("path");

/**
 * @typedef {{ tipo: "module", modulo: string, caminho: string }
 *   | { tipo: "framework", biblioteca: string, caminho: string }} Urn
 * @typedef {{ modulos: Map<string, string>, bibliotecas: Map<string, string> }} Componentes
 */

const PREFIXO = "urn:magento:";

/**
 * Decompõe uma URN do Magento. Devolve null se não for uma URN suportada.
 * @param {string} urn
 * @returns {Urn | null}
 */
function analisarUrn(urn) {
	const texto = urn.trim();
	if (!texto.startsWith(PREFIXO)) return null;
	const resto = texto.slice(PREFIXO.length);
	const modulo = /^module:([A-Za-z0-9]+_[A-Za-z0-9]+):(.+)$/.exec(resto);
	if (modulo) return { tipo: "module", modulo: modulo[1], caminho: modulo[2] };
	const framework = /^framework(-[a-z0-9]+(?:-[a-z0-9]+)*)?:(.+)$/.exec(resto);
	if (framework) return { tipo: "framework", biblioteca: `magento/framework${framework[1] || ""}`, caminho: framework[2] };
	return null;
}

/**
 * Resolve a URN para um caminho absoluto, ou null se o componente não estiver
 * registrado no projeto. O caminho nunca sai da pasta do componente e sempre
 * termina em .xsd (a URN vem do arquivo do usuário, e não se lê outra coisa).
 * @param {string} urn
 * @param {Componentes} componentes
 * @returns {string | null}
 */
function resolverUrn(urn, componentes) {
	const partes = analisarUrn(urn);
	if (!partes) return null;
	const base = partes.tipo === "module" ? componentes.modulos.get(partes.modulo) : componentes.bibliotecas.get(partes.biblioteca);
	if (!base) return null;
	const destino = path.resolve(base, partes.caminho);
	const relativo = path.relative(base, destino);
	if (relativo.startsWith("..") || path.isAbsolute(relativo)) return null;
	if (!destino.toLowerCase().endsWith(".xsd")) return null;
	return destino;
}

/**
 * Lê as chamadas `ComponentRegistrar::register(...)` de um registration.php.
 * Aceita `__DIR__` sozinho ou concatenado com um texto (`__DIR__ . '/src'`), e a
 * vírgula depois do último argumento que o PHP 7.3+ permite e o PER-CS 2.0 exige
 * nas chamadas de várias linhas.
 * @param {string} php
 * @returns {{ tipo: string, nome: string, sufixo: string }[]}
 */
function lerRegistro(php) {
	const saida = [];
	const padrao =
		/ComponentRegistrar::register\(\s*(?:\\?[\w\\]*ComponentRegistrar)::(MODULE|LIBRARY|THEME|LANGUAGE|SETUP)\s*,\s*(['"])([^'"]+)\2\s*,\s*__DIR__\s*(?:\.\s*(['"])([^'"]*)\4\s*)?,?\s*\)/g;
	for (const m of php.matchAll(padrao)) saida.push({ tipo: m[1], nome: m[3], sufixo: m[5] || "" });
	return saida;
}

/**
 * Lê os registration.php listados no vendor/composer/autoload_files.php. É por aí
 * que o Composer carrega o registro de cada pacote (o composer.json de um módulo
 * declara `"autoload": { "files": [ "registration.php" ] }`, ver
 * commerce-php, development/build/composer-integration.md).
 * @param {string} php conteúdo do autoload_files.php
 * @param {string} raiz pasta do projeto (o `$baseDir`)
 * @param {string} vendor pasta vendor (o `$vendorDir`)
 * @returns {string[]}
 */
function registrosDoAutoload(php, raiz, vendor) {
	const saida = [];
	for (const m of php.matchAll(/\$(vendorDir|baseDir)\s*\.\s*'([^']*registration\.php)'/g)) {
		saida.push(path.join(m[1] === "vendorDir" ? vendor : raiz, m[2]));
	}
	return saida;
}

/**
 * Acha a URN declarada no elemento raiz (`xsi:noNamespaceSchemaLocation`), com a
 * posição do valor no texto. Só olha o primeiro elemento: comentários, a
 * declaração XML e instruções de processamento antes dele são pulados.
 * @param {string} xml
 * @returns {{ urn: string, inicio: number, fim: number } | null}
 */
function urnDoXml(xml) {
	let i = 0;
	for (;;) {
		const abre = xml.indexOf("<", i);
		if (abre < 0) return null;
		if (xml.startsWith("<?", abre)) i = fimDe(xml, "?>", abre);
		else if (xml.startsWith("<!--", abre)) i = fimDe(xml, "-->", abre);
		else if (xml.startsWith("<!", abre)) i = fimDe(xml, ">", abre);
		else {
			const fecha = xml.indexOf(">", abre);
			const tag = xml.slice(abre, fecha < 0 ? xml.length : fecha);
			const m = /\sxsi:noNamespaceSchemaLocation\s*=\s*(["'])(.*?)\1/.exec(tag);
			if (!m || !m[2].trim().startsWith(PREFIXO)) return null;
			const inicio = abre + m.index + m[0].indexOf(m[1]) + 1;
			return { urn: m[2].trim(), inicio, fim: inicio + m[2].length };
		}
		if (i < 0) return null;
	}
}

/**
 * @param {string} texto
 * @param {string} marca
 * @param {number} desde
 */
function fimDe(texto, marca, desde) {
	const p = texto.indexOf(marca, desde);
	return p < 0 ? -1 : p + marca.length;
}

module.exports = { analisarUrn, resolverUrn, lerRegistro, registrosDoAutoload, urnDoXml };
