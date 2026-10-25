// @ts-check
"use strict";

// Gera images/icon.png (256x256) a partir do ladrillo da commente.me
// (images/ladrillo-commente.svg, cópia do kit de marca v3.3.1 sem os metadados).
// Pela marca, o app icon é o ladrillo: nenhum produto tem ícone nem cor própria.
// Precisa do `sharp` (devDependency).
//
//   node scripts/gerar-icone.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const LADO = 256;
const RAIZ = path.join(__dirname, "..");
const origem = path.join(RAIZ, "images", "ladrillo-commente.svg");
const destino = path.join(RAIZ, "images", "icon.png");

sharp(fs.readFileSync(origem), { density: 72 * (LADO / 100) })
	.resize(LADO, LADO)
	.png({ compressionLevel: 9 })
	.toFile(destino)
	.then(() => console.log(`images/icon.png (${LADO}x${LADO}) a partir do ladrillo`))
	.catch((erro) => {
		console.error(erro.message);
		process.exit(1);
	});
