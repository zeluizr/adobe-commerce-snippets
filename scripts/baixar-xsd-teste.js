// @ts-check
"use strict";

// Baixa do magento/magento2 os XSD, os registration.php e os composer.json de uma
// tag, para os testes. NADA disso entra no repositório nem no .vsix: o código do
// magento2 é OSL-3.0 e este pacote é MIT. Tudo fica numa pasta temporária fora do
// repositório (os.tmpdir(), ou ADOBE_COMMERCE_XSD_CACHE).
//
// Monta duas instalações falsas a partir do tarball:
//   <cache>/<tag>/vendor   um projeto com Composer: vendor/magento/<pacote>/ e o
//                          vendor/composer/autoload_files.php, como num projeto real;
//   <cache>/<tag>/clone    o layout do clone do magento2 (app/code e lib/internal),
//                          com os XML do core, para o teste de falso positivo.
//
//   node scripts/baixar-xsd-teste.js [tag]

const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const zlib = require("zlib");

const TAG_PADRAO = "2.4.9";

/** @param {string} [tag] */
function pastaDoCache(tag = TAG_PADRAO) {
	const base = process.env.ADOBE_COMMERCE_XSD_CACHE || path.join(os.tmpdir(), "adobe-commerce-snippets-teste");
	return path.join(base, tag);
}

/**
 * @param {string} url
 * @returns {Promise<import("http").IncomingMessage>}
 */
function pedir(url, saltos = 5) {
	return new Promise((resolve, reject) => {
		https
			.get(url, { headers: { "user-agent": "adobe-commerce-snippets-teste" } }, (resposta) => {
				const { statusCode = 0, headers } = resposta;
				if (statusCode >= 300 && statusCode < 400 && headers.location && saltos > 0) {
					resposta.resume();
					resolve(pedir(new URL(headers.location, url).toString(), saltos - 1));
				} else if (statusCode !== 200) {
					resposta.resume();
					reject(new Error(`HTTP ${statusCode} em ${url}`));
				} else resolve(resposta);
			})
			.on("error", reject);
	});
}

/**
 * Lê um tar (já descomprimido) em fluxo e chama `aoArquivo` para cada arquivo
 * regular cujo caminho `querer` aceitar. Entende os cabeçalhos ustar, os pax
 * (`x` e `g`) e o nome longo do GNU (`L`), que é o que o GitHub gera.
 * @param {NodeJS.ReadableStream} fluxo
 * @param {(nome: string) => boolean} querer
 * @param {(nome: string, dados: Buffer) => void} aoArquivo
 * @returns {Promise<void>}
 */
function lerTar(fluxo, querer, aoArquivo) {
	return new Promise((resolve, reject) => {
		/** @type {Buffer[]} */
		let pedacos = [];
		let disponivel = 0;
		/** @type {{ nome: string, tamanho: number, tipo: string, resto: number, partes: Buffer[] } | null} */
		let atual = null;
		let nomeLongo = "";

		/** @param {number} n */
		function tirar(n) {
			const tudo = pedacos.length === 1 ? pedacos[0] : Buffer.concat(pedacos);
			const saida = tudo.subarray(0, n);
			pedacos = [tudo.subarray(n)];
			disponivel -= n;
			return saida;
		}

		/** @param {Buffer} b @param {number} ini @param {number} tam */
		const texto = (b, ini, tam) => b.toString("utf8", ini, ini + tam).replace(/\0.*$/s, "");

		function processar() {
			for (;;) {
				if (!atual) {
					if (disponivel < 512) return;
					const cab = tirar(512);
					if (cab.every((x) => x === 0)) continue;
					const nome = texto(cab, 0, 100);
					const tamanho = parseInt(texto(cab, 124, 12).trim() || "0", 8);
					const tipo = String.fromCharCode(cab[156] || 48);
					const prefixo = cab.toString("utf8", 257, 263).startsWith("ustar") ? texto(cab, 345, 155) : "";
					let completo = prefixo ? `${prefixo}/${nome}` : nome;
					if (nomeLongo) {
						completo = nomeLongo;
						nomeLongo = "";
					}
					atual = { nome: completo, tamanho, tipo, resto: Math.ceil(tamanho / 512) * 512, partes: [] };
				}
				if (disponivel < atual.resto) return;
				const bloco = tirar(atual.resto);
				const dados = bloco.subarray(0, atual.tamanho);
				const { nome, tipo } = atual;
				atual = null;
				if (tipo === "x") {
					const m = /\d+ path=([^\n]*)\n/.exec(dados.toString("utf8"));
					if (m) nomeLongo = m[1];
				} else if (tipo === "L") nomeLongo = dados.toString("utf8").replace(/\0.*$/s, "");
				else if ((tipo === "0" || tipo === "\0") && querer(nome)) aoArquivo(nome, Buffer.from(dados));
			}
		}

		fluxo.on("data", (/** @type {Buffer} */ c) => {
			pedacos.push(c);
			disponivel += c.length;
			try {
				processar();
			} catch (erro) {
				reject(erro);
			}
		});
		fluxo.on("end", () => resolve());
		fluxo.on("error", reject);
	});
}

/** @param {string} arquivo @param {Buffer | string} dados */
function gravar(arquivo, dados) {
	fs.mkdirSync(path.dirname(arquivo), { recursive: true });
	fs.writeFileSync(arquivo, dados);
}

/**
 * Baixa e monta as duas instalações, se ainda não estiverem no cache.
 * @param {string} [tag]
 * @returns {Promise<{ vendor: string, clone: string, tag: string }>}
 */
async function prepararXsd(tag = TAG_PADRAO) {
	const pasta = pastaDoCache(tag);
	const pronto = path.join(pasta, "pronto");
	const resultado = { vendor: path.join(pasta, "vendor"), clone: path.join(pasta, "clone"), tag };
	if (fs.existsSync(pronto)) return resultado;
	fs.rmSync(pasta, { recursive: true, force: true });

	const resposta = await pedir(`https://codeload.github.com/magento/magento2/tar.gz/refs/tags/${tag}`);
	// O que interessa: XSD, registration.php e composer.json dos componentes, e os XML
	// de configuração e de layout do core (fora dos testes do próprio magento2).
	const interessa = (/** @type {string} */ nome) => {
		const relativo = nome.split("/").slice(1).join("/");
		if (!/^(app\/code|lib\/internal\/Magento\/Framework)\//.test(relativo)) return false;
		if (/\/Test\//.test(relativo)) return false;
		return /\.(xsd|xml)$/.test(relativo) || /\/(registration\.php|composer\.json)$/.test(relativo);
	};
	/** @type {Map<string, Buffer>} */
	const arquivos = new Map();
	await lerTar(resposta.pipe(zlib.createGunzip()), interessa, (nome, dados) => arquivos.set(nome.split("/").slice(1).join("/"), dados));

	// O clone: tudo como veio.
	for (const [relativo, dados] of arquivos) gravar(path.join(resultado.clone, relativo), dados);

	// O vendor: cada pasta com registration.php vira o pacote do nome do composer.json.
	const raizes = [...arquivos.keys()]
		.filter((r) => r.endsWith("/registration.php"))
		.map((r) => r.slice(0, -"/registration.php".length))
		.sort((a, b) => b.length - a.length);
	/** @type {string[]} */
	const autoload = [];
	for (const [relativo, dados] of arquivos) {
		if (relativo.endsWith(".xml")) continue;
		const dono = raizes.find((r) => relativo.startsWith(`${r}/`));
		if (!dono) continue;
		const composer = arquivos.get(`${dono}/composer.json`);
		if (!composer) continue;
		const pacote = JSON.parse(composer.toString("utf8")).name;
		const destino = path.join(resultado.vendor, "vendor", ...pacote.split("/"), relativo.slice(dono.length + 1));
		gravar(destino, dados);
		if (relativo === `${dono}/registration.php`) autoload.push(`    'r${autoload.length}' => $vendorDir . '/${pacote}/registration.php',`);
	}
	gravar(
		path.join(resultado.vendor, "vendor", "composer", "autoload_files.php"),
		["<?php", "", "$vendorDir = dirname(__DIR__);", "$baseDir = dirname($vendorDir);", "", "return array(", ...autoload, ");", ""].join("\n")
	);
	gravar(pronto, `magento/magento2 ${tag}\n`);
	return resultado;
}

module.exports = { prepararXsd, pastaDoCache, lerTar, TAG_PADRAO };

if (require.main === module) {
	prepararXsd(process.argv[2])
		.then((r) => console.log(`XSD de magento/magento2 ${r.tag}:\n  ${r.vendor}\n  ${r.clone}`))
		.catch((erro) => {
			console.error(erro.message);
			process.exit(1);
		});
}
