// @ts-check
"use strict";

// Gera images/icon.png (256x256) a partir de images/icon.svg, o ícone de produto
// para devs do kit de marca v7: o ladrillo da commente.me com o destaque na cor
// da plataforma e o glifo de snippets no quarto bloco.
// Precisa do `sharp` (devDependency).
//
//   node scripts/gerar-icone.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const LADO = 256;
const RAIZ = path.join(__dirname, "..");
const origem = path.join(RAIZ, "images", "icon.svg");
const destino = path.join(RAIZ, "images", "icon.png");

sharp(fs.readFileSync(origem), { density: 72 * (LADO / 100) })
	.resize(LADO, LADO)
	.png({ compressionLevel: 9 })
	.toFile(destino)
	.then(() => console.log(`images/icon.png (${LADO}x${LADO}) a partir de images/icon.svg`))
	.catch((erro) => {
		console.error(erro.message);
		process.exit(1);
	});
