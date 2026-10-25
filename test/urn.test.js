// @ts-check
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { analisarUrn, resolverUrn, lerRegistro, registrosDoAutoload, urnDoXml } = require("../lib/urn");
const { acharRaiz, lerComponentes } = require("../lib/componentes");

const PROJETO = path.join(__dirname, "fixtures", "projeto");

test("analisarUrn entende os três formatos", () => {
	assert.deepEqual(analisarUrn("urn:magento:module:Magento_Catalog:etc/product_types.xsd"), {
		tipo: "module",
		modulo: "Magento_Catalog",
		caminho: "etc/product_types.xsd"
	});
	assert.deepEqual(analisarUrn("urn:magento:framework:ObjectManager/etc/config.xsd"), {
		tipo: "framework",
		biblioteca: "magento/framework",
		caminho: "ObjectManager/etc/config.xsd"
	});
	assert.deepEqual(analisarUrn("urn:magento:framework-message-queue:etc/topology.xsd"), {
		tipo: "framework",
		biblioteca: "magento/framework-message-queue",
		caminho: "etc/topology.xsd"
	});
	assert.equal(analisarUrn("urn:magento:outra:coisa.xsd"), null);
	assert.equal(analisarUrn("http://www.w3.org/2001/XMLSchema"), null);
	assert.equal(analisarUrn("urn:magento:module:SemSublinhado:etc/a.xsd"), null);
});

test("resolverUrn usa o mapa de componentes e não sai da pasta do componente", () => {
	const raiz = path.resolve("/projeto");
	const componentes = {
		modulos: new Map([["Vendor_Module", path.join(raiz, "app/code/Vendor/Module")]]),
		bibliotecas: new Map([
			["magento/framework", path.join(raiz, "vendor/magento/framework")],
			["magento/framework-amqp", path.join(raiz, "vendor/magento/framework-amqp")]
		])
	};
	assert.equal(resolverUrn("urn:magento:module:Vendor_Module:etc/a.xsd", componentes), path.join(raiz, "app/code/Vendor/Module/etc/a.xsd"));
	assert.equal(resolverUrn("urn:magento:module:Vendor_Module:etc/./a.xsd", componentes), path.join(raiz, "app/code/Vendor/Module/etc/a.xsd"));
	assert.equal(resolverUrn("urn:magento:framework:Acl/etc/acl.xsd", componentes), path.join(raiz, "vendor/magento/framework/Acl/etc/acl.xsd"));
	assert.equal(resolverUrn("urn:magento:framework-amqp:etc/queue.xsd", componentes), path.join(raiz, "vendor/magento/framework-amqp/etc/queue.xsd"));
	assert.equal(resolverUrn("urn:magento:framework-bulk:etc/x.xsd", componentes), null, "biblioteca não registrada");
	assert.equal(resolverUrn("urn:magento:module:Outro_Modulo:etc/a.xsd", componentes), null, "módulo não registrado");
	assert.equal(resolverUrn("urn:magento:module:Vendor_Module:../../../../etc/a.xsd", componentes), null, "sai da pasta");
	assert.equal(resolverUrn("urn:magento:module:Vendor_Module:registration.php", componentes), null, "não é XSD");
});

test("lerRegistro lê as formas de ComponentRegistrar::register", () => {
	assert.deepEqual(lerRegistro("ComponentRegistrar::register(ComponentRegistrar::MODULE, 'Vendor_Module', __DIR__);"), [
		{ tipo: "MODULE", nome: "Vendor_Module", sufixo: "" }
	]);
	assert.deepEqual(
		lerRegistro(`\\Magento\\Framework\\Component\\ComponentRegistrar::register(\n\t\\Magento\\Framework\\Component\\ComponentRegistrar::LIBRARY,\n\t"magento/framework-amqp",\n\t__DIR__ . '/src'\n);`),
		[{ tipo: "LIBRARY", nome: "magento/framework-amqp", sufixo: "/src" }]
	);
	assert.deepEqual(lerRegistro("<?php echo 'nada';"), []);
});

test("registrosDoAutoload lê o vendorDir e o baseDir", () => {
	const php = [
		"return array(",
		"    'a1' => $vendorDir . '/magento/framework/registration.php',",
		"    'b2' => $baseDir . '/app/etc/NonComposerComponentRegistration.php',",
		"    'c3' => $baseDir . '/registration.php',",
		"    'd4' => $vendorDir . '/symfony/polyfill-php80/bootstrap.php',",
		");"
	].join("\n");
	const raiz = path.resolve("/p");
	assert.deepEqual(registrosDoAutoload(php, raiz, path.join(raiz, "vendor")), [
		path.join(raiz, "vendor/magento/framework/registration.php"),
		path.join(raiz, "registration.php")
	]);
});

test("urnDoXml acha a URN do elemento raiz, depois de declaração e comentários", () => {
	const xml = `<?xml version="1.0"?>\n<!--\n<config xsi:noNamespaceSchemaLocation="urn:magento:framework:X.xsd"/>\n-->\n<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n        xsi:noNamespaceSchemaLocation="urn:magento:framework:Event/etc/events.xsd">\n</config>`;
	const achada = urnDoXml(xml);
	assert.ok(achada);
	assert.equal(achada.urn, "urn:magento:framework:Event/etc/events.xsd");
	assert.equal(xml.slice(achada.inicio, achada.fim), achada.urn);
	assert.equal(urnDoXml('<config xsi:noNamespaceSchemaLocation="config.xsd"/>'), null, "não é URN do Magento");
	assert.equal(urnDoXml("<config/>"), null);
	assert.equal(urnDoXml(""), null);
});

test("acharRaiz sobe até a raiz do projeto", () => {
	assert.equal(acharRaiz(path.join(PROJETO, "app/code/Exemplo/Teste/etc/di.xml")), PROJETO);
	assert.equal(acharRaiz(path.join(PROJETO, "app/code/Novo/Modulo/etc/nao-existe.xml")), PROJETO);
});

test("lerComponentes acha módulos de app/code e bibliotecas do framework", () => {
	const c = lerComponentes(PROJETO);
	assert.equal(c.modulos.get("Exemplo_Teste"), path.join(PROJETO, "app/code/Exemplo/Teste"));
	assert.equal(c.modulos.get("Exemplo_Src"), path.join(PROJETO, "app/code/Exemplo/Src/src"));
	assert.equal(c.bibliotecas.get("magento/framework"), path.join(PROJETO, "lib/internal/Magento/Framework"));
	assert.equal(c.bibliotecas.get("magento/framework-fila"), path.join(PROJETO, "lib/internal/Magento/Framework/Fila"));
	assert.equal(resolverUrn("urn:magento:module:Exemplo_Src:etc/src.xsd", c), path.join(PROJETO, "app/code/Exemplo/Src/src/etc/src.xsd"));
});
