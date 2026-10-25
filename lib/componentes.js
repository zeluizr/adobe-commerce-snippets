// @ts-check
"use strict";

// Descobre a raiz do projeto Adobe Commerce e os componentes registrados nele
// (módulos e bibliotecas), lendo os registration.php do disco. Sem `vscode`.
//
// De onde vêm os registration.php, na ordem:
// 1. vendor/composer/autoload_files.php: todo pacote instalado pelo Composer
//    declara o registration.php em `autoload.files`
//    (commerce-php, development/build/composer-integration.md).
// 2. app/code/<Vendor>/<Module>/registration.php: os módulos do próprio projeto
//    (commerce-php, architecture/modules/overview.md).
// 3. lib/internal/Magento/Framework e as subpastas dele: a instalação a partir do
//    clone do magento/magento2, onde o framework não está em vendor/.
// 4. vendor/<vendor>/<pacote>/registration.php, só quando não há
//    autoload_files.php (um vendor/ copiado sem o Composer).

const fs = require("fs");
const path = require("path");
const { lerRegistro, registrosDoAutoload } = require("./urn");

/** @typedef {import("./urn").Componentes} Componentes */

/** @param {string} caminho */
function existe(caminho) {
	try {
		fs.statSync(caminho);
		return true;
	} catch {
		return false;
	}
}

/** @param {string} pasta */
function subpastas(pasta) {
	try {
		return fs
			.readdirSync(pasta, { withFileTypes: true })
			.filter((d) => d.isDirectory() || d.isSymbolicLink())
			.map((d) => path.join(pasta, d.name));
	} catch {
		return [];
	}
}

/**
 * A pasta mais próxima, subindo a partir do arquivo, que parece a raiz de um
 * projeto: tem o autoload do Composer, o app/etc/di.xml da instalação ou o
 * framework do clone. Null se não houver.
 * @param {string} arquivo
 * @returns {string | null}
 */
function acharRaiz(arquivo) {
	let pasta = path.dirname(path.resolve(arquivo));
	for (;;) {
		if (
			existe(path.join(pasta, "vendor", "composer", "autoload_files.php")) ||
			existe(path.join(pasta, "app", "etc", "di.xml")) ||
			existe(path.join(pasta, "lib", "internal", "Magento", "Framework", "registration.php"))
		)
			return pasta;
		const acima = path.dirname(pasta);
		if (acima === pasta) return null;
		pasta = acima;
	}
}

/**
 * Lista os registration.php do projeto.
 * @param {string} raiz
 * @returns {string[]}
 */
function arquivosDeRegistro(raiz) {
	const vendor = path.join(raiz, "vendor");
	const arquivos = [];
	const autoload = path.join(vendor, "composer", "autoload_files.php");
	if (existe(autoload)) arquivos.push(...registrosDoAutoload(fs.readFileSync(autoload, "utf8"), raiz, vendor));
	else for (const v of subpastas(vendor)) for (const p of subpastas(v)) arquivos.push(path.join(p, "registration.php"));
	for (const v of subpastas(path.join(raiz, "app", "code"))) for (const m of subpastas(v)) arquivos.push(path.join(m, "registration.php"));
	const framework = path.join(raiz, "lib", "internal", "Magento", "Framework");
	arquivos.push(path.join(framework, "registration.php"));
	for (const p of subpastas(framework)) arquivos.push(path.join(p, "registration.php"));
	return [...new Set(arquivos)].filter(existe);
}

/**
 * Monta o mapa de componentes do projeto. Quando o mesmo nome aparece duas vezes,
 * vale o primeiro: o vendor/ (o que o Composer instalou) vem antes de app/code.
 * @param {string} raiz
 * @returns {Componentes}
 */
function lerComponentes(raiz) {
	/** @type {Componentes} */
	const componentes = { modulos: new Map(), bibliotecas: new Map() };
	for (const arquivo of arquivosDeRegistro(raiz)) {
		let php;
		try {
			php = fs.readFileSync(arquivo, "utf8");
		} catch {
			continue;
		}
		const pasta = path.dirname(arquivo);
		for (const r of lerRegistro(php)) {
			const destino = path.join(pasta, r.sufixo);
			if (r.tipo === "MODULE" && !componentes.modulos.has(r.nome)) componentes.modulos.set(r.nome, destino);
			if (r.tipo === "LIBRARY" && !componentes.bibliotecas.has(r.nome)) componentes.bibliotecas.set(r.nome, destino);
		}
	}
	return componentes;
}

module.exports = { acharRaiz, lerComponentes, arquivosDeRegistro };
