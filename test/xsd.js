// @ts-check
"use strict";

// Os XSD do magento2 para os testes, baixados para uma pasta temporária fora do
// repositório (ver scripts/baixar-xsd-teste.js). Sem rede, os testes que precisam
// deles são pulados, e não falham.

const { prepararXsd } = require("../scripts/baixar-xsd-teste");

/** @type {Promise<{ vendor: string, clone: string, tag: string } | null> | null} */
let pronto = null;

function xsdDeTeste() {
	if (!pronto)
		pronto = prepararXsd().catch((erro) => {
			console.error(`sin los XSD de magento/magento2: ${erro.message}`);
			return null;
		});
	return pronto;
}

module.exports = { xsdDeTeste };
