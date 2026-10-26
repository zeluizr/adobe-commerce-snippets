// @ts-check
"use strict";

// Fiação com o VS Code: diagnósticos dos XML que declaram um esquema
// urn:magento, ao abrir, ao salvar e ao digitar (com espera). Toda a lógica fica
// em lib/ (pura e testável); aqui só se converte offset em posição, se escuta o
// editor e se escreve no output channel por que um XML não foi validado.

const vscode = require("vscode");
const { criarValidador } = require("./lib/validador");

const ESPERA_MS = 400;
const NOME = "Snippets for Adobe Commerce";

/** @param {vscode.ExtensionContext} contexto */
function activate(contexto) {
	const colecao = vscode.languages.createDiagnosticCollection("adobe-commerce-snippets");
	const saida = vscode.window.createOutputChannel(NOME);
	const validador = criarValidador();
	contexto.subscriptions.push(colecao, saida, { dispose: () => validador.encerrar() });

	/** @type {Map<string, NodeJS.Timeout>} */
	const pendentes = new Map();
	/** Último motivo escrito por arquivo, para não repetir a mesma linha a cada tecla. */
	/** @type {Map<string, string>} */
	const motivos = new Map();

	/** @param {vscode.TextDocument} documento */
	async function validar(documento) {
		if (documento.languageId !== "xml" || documento.uri.scheme !== "file") return;
		const chave = documento.uri.toString();
		const ativo = vscode.workspace.getConfiguration("adobeCommerceSnippets", documento.uri).get("validarXml", true);
		if (!ativo) {
			colecao.delete(documento.uri);
			return;
		}
		const versao = documento.version;
		let resultado;
		try {
			resultado = await validador.validar(documento.uri.fsPath, documento.getText());
		} catch (erro) {
			saida.appendLine(`${documento.uri.fsPath}: ${/** @type {Error} */ (erro).message}`);
			colecao.delete(documento.uri);
			return;
		}
		if (documento.isClosed || documento.version !== versao) return;
		if (resultado.motivo && motivos.get(chave) !== resultado.motivo) saida.appendLine(resultado.motivo);
		if (resultado.motivo) motivos.set(chave, resultado.motivo);
		else motivos.delete(chave);
		colecao.set(
			documento.uri,
			resultado.problemas.map((p) => {
				const intervalo = new vscode.Range(documento.positionAt(p.inicio), documento.positionAt(p.fim));
				const severidade = p.severidade === "aviso" ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Error;
				const diagnostico = new vscode.Diagnostic(intervalo, p.mensagem, severidade);
				diagnostico.source = NOME;
				return diagnostico;
			})
		);
	}

	/** @param {vscode.TextDocument} documento */
	function agendar(documento) {
		const chave = documento.uri.toString();
		const anterior = pendentes.get(chave);
		if (anterior) clearTimeout(anterior);
		pendentes.set(
			chave,
			setTimeout(() => {
				pendentes.delete(chave);
				validar(documento);
			}, ESPERA_MS)
		);
	}

	function revalidarTudo() {
		vscode.workspace.textDocuments.forEach(validar);
	}

	// Um módulo novo, um composer install ou um registration.php editado mudam o
	// mapa de componentes. Os XSD em si são conferidos pela data de modificação.
	const observadores = ["**/registration.php", "**/vendor/composer/autoload_files.php"].map((padrao) => {
		const w = vscode.workspace.createFileSystemWatcher(padrao);
		const esquecer = () => {
			validador.esquecer();
			revalidarTudo();
		};
		w.onDidCreate(esquecer);
		w.onDidChange(esquecer);
		w.onDidDelete(esquecer);
		return w;
	});

	contexto.subscriptions.push(
		...observadores,
		vscode.workspace.onDidOpenTextDocument(validar),
		vscode.workspace.onDidSaveTextDocument(validar),
		vscode.workspace.onDidChangeTextDocument((e) => agendar(e.document)),
		vscode.workspace.onDidCloseTextDocument((d) => {
			colecao.delete(d.uri);
			motivos.delete(d.uri.toString());
		}),
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration("adobeCommerceSnippets")) revalidarTudo();
		}),
		{ dispose: () => pendentes.forEach((t) => clearTimeout(t)) }
	);

	revalidarTudo();
}

function deactivate() {}

module.exports = { activate, deactivate };
