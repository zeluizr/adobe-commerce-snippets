// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { criarValidador } = require("../lib/validador");
const { xsdDeTeste } = require("./xsd");

const PROJETO = path.join(__dirname, "fixtures", "projeto");
const XSI = 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"';

/** @param {string} urn @param {string} conteudo */
const xml = (urn, conteudo) => `<?xml version="1.0"?>\n<config ${XSI} xsi:noNamespaceSchemaLocation="${urn}">\n${conteudo}\n</config>\n`;

test("com a fixture própria: include por URN, erro no lugar certo e sem XSD sem diagnóstico", async (t) => {
	const v = criarValidador();
	t.after(() => v.encerrar());
	const arquivo = path.join(PROJETO, "app/code/Exemplo/Teste/etc/teste.xml");
	const urn = "urn:magento:module:Exemplo_Teste:etc/teste.xsd";

	const valido = await v.validar(arquivo, xml(urn, '\t<item name="um_item" sortOrder="10"/>'));
	assert.deepEqual(valido.problemas, []);
	assert.equal(valido.xsd, path.join(PROJETO, "app/code/Exemplo/Teste/etc/teste.xsd"));

	// nomeType vem do XSD incluído por URN do framework: se o include não fosse
	// resolvido, a compilação falharia e não haveria diagnóstico nenhum.
	const texto = xml(urn, '\t<item name="Com-Maiuscula" sortOrder="dez"/>\n\t<outro/>');
	const invalido = await v.validar(arquivo, texto);
	assert.equal(invalido.problemas.length, 3, JSON.stringify(invalido.problemas));
	const trechos = invalido.problemas.map((p) => texto.slice(p.inicio, p.fim));
	assert.deepEqual(trechos.sort(), ["name", "outro", "sortOrder"].sort());
	assert.ok(invalido.problemas.every((p) => p.severidade === "erro"));
	assert.ok(invalido.problemas.some((p) => /no cumple el patrón/.test(p.mensagem)), JSON.stringify(invalido.problemas));
	assert.ok(invalido.problemas.some((p) => /no se esperaba/.test(p.mensagem)));

	const malFormado = "<?xml version=\"1.0\"?>\n<config " + XSI + ` xsi:noNamespaceSchemaLocation="${urn}">\n\t<item name="a">\n</config>\n`;
	const r = await v.validar(arquivo, malFormado);
	assert.ok(r.problemas.length >= 1);
	assert.ok(r.problemas.some((p) => /no corresponde/.test(p.mensagem)), JSON.stringify(r.problemas));

	const semModulo = await v.validar(arquivo, xml("urn:magento:module:Nao_Existe:etc/a.xsd", "<qualquer/>"));
	assert.deepEqual(semModulo.problemas, []);
	assert.match(semModulo.motivo || "", /XSD no encontrado/);

	const includeAusente = await v.validar(arquivo, xml("urn:magento:framework-fila:etc/fila.xsd", "<qualquer/>"));
	assert.deepEqual(includeAusente.problemas, [], "include que não resolve: sem diagnóstico");
	assert.match(includeAusente.motivo || "", /no se pudo compilar/);

	const semUrn = await v.validar(arquivo, "<config><qualquer/></config>");
	assert.deepEqual(semUrn, { problemas: [] });

	const foraDeProjeto = await v.validar(path.join(path.parse(PROJETO).root, "fora", "di.xml"), xml(urn, ""));
	assert.deepEqual(foraDeProjeto.problemas, []);
});

test("o XSD é recompilado quando muda no disco", async (t) => {
	const os = require("os");
	const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "acs-recompila-"));
	t.after(() => fs.rmSync(pasta, { recursive: true, force: true }));
	fs.cpSync(PROJETO, pasta, { recursive: true });
	const v = criarValidador();
	t.after(() => v.encerrar());
	const arquivo = path.join(pasta, "app/code/Exemplo/Src/src/etc/src.xml");
	const urn = "urn:magento:module:Exemplo_Src:etc/src.xsd";
	assert.deepEqual((await v.validar(arquivo, xml(urn, "texto").replace(/\n/g, ""))).problemas, []);
	const xsd = path.join(pasta, "app/code/Exemplo/Src/src/etc/src.xsd");
	fs.writeFileSync(xsd, fs.readFileSync(xsd, "utf8").replace('type="xs:string"', 'type="xs:int"'));
	const futuro = new Date(Date.now() + 5000);
	fs.utimesSync(xsd, futuro, futuro);
	assert.equal((await v.validar(arquivo, xml(urn, "texto").replace(/\n/g, ""))).problemas.length, 1);
});

test("com os XSD do magento2: XML válidos sem falso positivo e erros no lugar certo", async (t) => {
	const xsd = await xsdDeTeste();
	if (!xsd) return t.skip("sin red para bajar los XSD");
	const v = criarValidador();
	t.after(() => v.encerrar());
	const arquivo = path.join(xsd.vendor, "app/code/Vendor/Module/etc/di.xml");
	const di = "urn:magento:framework:ObjectManager/etc/config.xsd";

	const valido = xml(
		di,
		[
			'\t<preference for="Vendor\\Module\\Api\\ExampleInterface" type="Vendor\\Module\\Model\\Example"/>',
			'\t<type name="Magento\\Catalog\\Model\\Product">',
			'\t\t<plugin name="vendor_module" type="Vendor\\Module\\Plugin\\Product" sortOrder="10"/>',
			"\t\t<arguments>",
			'\t\t\t<argument name="data" xsi:type="array">',
			'\t\t\t\t<item name="a" xsi:type="string">a</item>',
			"\t\t\t</argument>",
			"\t\t</arguments>",
			"\t</type>"
		].join("\n")
	);
	const r = await v.validar(arquivo, valido);
	assert.deepEqual(r.problemas, []);
	assert.equal(r.xsd, path.join(xsd.vendor, "vendor/magento/framework/ObjectManager/etc/config.xsd"));

	const texto = xml(di, '\t<preference fr="A" type="B"/>\n\t<type name="X">\n\t\t<plugin name="p" type="Y" sortOrder="abc"/>\n\t</type>');
	const invalido = await v.validar(arquivo, texto);
	const achados = invalido.problemas.map((p) => [texto.slice(p.inicio, p.fim), p.mensagem]);
	assert.deepEqual(
		achados.map((a) => a[0]),
		["fr", "preference", "sortOrder"]
	);
	assert.match(achados[0][1], /El atributo 'fr' no está permitido/);
	assert.match(achados[1][1], /Falta el atributo obligatorio 'for'/);
	assert.match(achados[2][1], /'abc' no es un valor válido/);

	// xsi:type inexistente: um erro só, marcado no próprio xsi:type, sem o
	// "tipo abstrato" que o libxml2 acrescenta como consequência.
	const tipo = xml(di, '\t<type name="X">\n\t\t<arguments>\n\t\t\t<argument name="a" xsi:type="strin">x</argument>\n\t\t</arguments>\n\t</type>');
	const ruim = await v.validar(arquivo, tipo);
	assert.deepEqual(
		ruim.problemas.map((p) => [tipo.slice(p.inicio, p.fim), p.mensagem]),
		[["xsi:type", "<argument>, atributo xsi:type: El xsi:type 'strin' no existe en este esquema."]]
	);

	// framework-message-queue resolve para vendor/magento/framework-message-queue.
	const fila = await v.validar(
		arquivo,
		xml("urn:magento:framework-message-queue:etc/consumer.xsd", '\t<consumer name="a" queue="a" handler="A\\B::process"/>')
	);
	assert.deepEqual(fila.problemas, []);
	assert.equal(fila.xsd, path.join(xsd.vendor, "vendor/magento/framework-message-queue/etc/consumer.xsd"));
});

/**
 * Todos os XML de uma pasta que declaram URN do Magento.
 * @param {string} pasta
 * @returns {Generator<string>}
 */
function* xmlsDe(pasta) {
	for (const e of fs.readdirSync(pasta, { withFileTypes: true })) {
		const p = path.join(pasta, e.name);
		if (e.isDirectory()) {
			if (e.name === "node_modules" || e.name === ".git" || e.name === "generated" || e.name === "pub" || e.name === "var") continue;
			yield* xmlsDe(p);
		} else if (e.name.endsWith(".xml")) yield p;
	}
}

/**
 * @param {string} raiz
 * @param {import("node:test").TestContext} t
 */
async function semFalsoPositivo(raiz, t) {
	const v = criarValidador();
	t.after(() => v.encerrar());
	let validados = 0;
	/** @type {string[]} */
	const falhas = [];
	for (const arquivo of xmlsDe(raiz)) {
		const texto = fs.readFileSync(arquivo, "utf8");
		const r = await v.validar(arquivo, texto);
		if (r.xsd && !r.motivo) validados++;
		for (const p of r.problemas) falhas.push(`${path.relative(raiz, arquivo)}: ${p.mensagem}`);
	}
	t.diagnostic(`${validados} XML validados en ${raiz}`);
	assert.deepEqual(falhas.slice(0, 20), []);
	return validados;
}

test("nenhum falso positivo nos XML do core do magento2", async (t) => {
	const xsd = await xsdDeTeste();
	if (!xsd) return t.skip("sin red para bajar los XSD");
	const validados = await semFalsoPositivo(xsd.clone, t);
	assert.ok(validados > 2000, `só ${validados} XML validados`);
});

test("nenhum falso positivo num projeto real (ADOBE_COMMERCE_PROJETO)", { skip: !process.env.ADOBE_COMMERCE_PROJETO }, async (t) => {
	const raiz = path.resolve(String(process.env.ADOBE_COMMERCE_PROJETO));
	await semFalsoPositivo(raiz, t);
});
