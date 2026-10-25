// @ts-check
"use strict";

// Snippets de template (.phtml), de RequireJS e de GraphQL, escritos à mão a
// partir da documentação da Adobe (Apache-2.0); `pagina` diz de onde veio cada
// um. Lógica pura, sem `vscode`.

const { corpo } = require("./corpo");

/** @typedef {import("./snippets-xml").Snippet & { envoltorio?: string }} Snippet */

// O $escaper por contexto, como em commerce-php,
// development/security/cross-site-scripting.md. A página só cobre escapeHtml,
// escapeHtmlAttr, escapeUrl e escapeJs; outros métodos do Escaper não entram.
const XSS = "commerce-php/src/pages/development/security/cross-site-scripting.md";

/** @type {Record<string, Snippet>} */
const SNIPPETS_PHTML = {
	"phtml: cabecera": {
		prefix: "ac-phtml",
		descricao: "Cabecera de un template: tipos de $block, $escaper y del ViewModel recibido en view_model.",
		pagina: "commerce-php/src/pages/development/components/view-models.md",
		body: corpo(String.raw`
			<?php
			/** @var \Magento\Framework\View\Element\Template $block */
			/** @var \Magento\Framework\Escaper $escaper */
			/** @var \#{1:Vendor\Module\ViewModel\Example} $viewModel */
			$viewModel = $block->getViewModel();
			?>
			$0
		`)
	},
	"escaper: html": {
		prefix: "ac-esc-html",
		descricao: "escapeHtml: texto dentro de HTML.",
		pagina: XSS,
		body: corpo(String.raw`<?= $escaper->escapeHtml(#{1:$block->getTitle()}) ?>`)
	},
	"escaper: html con etiquetas": {
		prefix: "ac-esc-html-tags",
		descricao: "escapeHtml con la lista de etiquetas permitidas (por ejemplo, enlaces dentro de una frase traducida).",
		pagina: XSS,
		body: corpo(String.raw`<?= $escaper->escapeHtml(__('#{1:Texto con <a href="%1">enlace</a>}', #{2:$block->getUrl()}), ['#{3:a}']) ?>`)
	},
	"escaper: atributo": {
		prefix: "ac-esc-attr",
		descricao: "escapeHtmlAttr: valor de un atributo HTML.",
		pagina: XSS,
		body: corpo(String.raw`<?= $escaper->escapeHtmlAttr(#{1:$value}) ?>`)
	},
	"escaper: url": {
		prefix: "ac-esc-url",
		descricao: "escapeUrl: URL en href o src.",
		pagina: XSS,
		body: corpo(String.raw`<?= $escaper->escapeUrl(#{1:$block->getUrl()}) ?>`)
	},
	"escaper: js": {
		prefix: "ac-esc-js",
		descricao: "escapeJs: cadena dentro de JavaScript. Dentro de un atributo onclick, envuélvelo además en escapeHtmlAttr.",
		pagina: XSS,
		body: corpo(String.raw`<?= $escaper->escapeJs(#{1:$value}) ?>`)
	}
};

const REQUIREJS = "commerce-frontend-core/src/pages/javascript/requirejs.md";
const MIXINS = "commerce-frontend-core/src/pages/javascript/mixins.md";

/** @type {Record<string, Snippet>} */
const SNIPPETS_JS = {
	"requirejs-config.js": {
		prefix: "ac-requirejs-config",
		descricao: "view/<área>/requirejs-config.js con map, paths y mixins.",
		pagina: REQUIREJS,
		body: corpo(String.raw`
			var config = {
				map: {
					'*': {
						#{1:alias}: '#{2:Vendor_Module/js/example}'
					}
				},
				paths: {
					'#{3:library}': '#{4:Vendor_Module/js/lib/library}'
				},
				config: {
					mixins: {
						'#{5:Magento_Checkout/js/proceed-to-checkout}': {
							'#{6:Vendor_Module/js/proceed-to-checkout-mixin}': true
						}
					}
				}
			};
		`)
	},
	"requirejs: map": {
		prefix: "ac-requirejs-map",
		descricao: "map: un alias para un módulo AMD; con '*' vale para todos los módulos.",
		pagina: REQUIREJS,
		envoltorio: "objeto",
		body: corpo(String.raw`
			map: {
				'#{1:*}': {
					#{2:alias}: '#{3:Vendor_Module/js/example}'
				}
			}
		`)
	},
	"requirejs: paths": {
		prefix: "ac-requirejs-paths",
		descricao: "paths: un alias para un archivo o una URL externa.",
		pagina: REQUIREJS,
		envoltorio: "objeto",
		body: corpo(String.raw`
			paths: {
				'#{1:alias}': '#{2:Vendor_Module/js/lib/file}'
			}
		`)
	},
	"requirejs: mixins": {
		prefix: "ac-requirejs-mixins",
		descricao: "config.mixins: asocia un mixin a un componente. Con false se desactiva el mixin de otro módulo.",
		pagina: MIXINS,
		envoltorio: "objeto",
		body: corpo(String.raw`
			config: {
				mixins: {
					'#{1:Magento_Checkout/js/proceed-to-checkout}': {
						'#{2:Vendor_Module/js/proceed-to-checkout-mixin}': true
					}
				}
			}
		`)
	},
	"mixin: componente UI": {
		prefix: "ac-mixin-component",
		descricao: "Mixin de un componente UI: devuelve target.extend() con los métodos nuevos; this._super() llama al original.",
		pagina: MIXINS,
		body: corpo(String.raw`
			define(function () {
				'use strict';

				var mixin = {
					#{1:method}: function () {
						$0
						return this._super();
					}
				};

				return function (target) {
					return target.extend(mixin);
				};
			});
		`)
	},
	"mixin: widget jQuery": {
		prefix: "ac-mixin-widget",
		descricao: "Mixin de un widget jQuery: redefine el widget con el mismo alias y lo devuelve.",
		pagina: MIXINS,
		body: corpo(String.raw`
			define(['jquery'], function ($) {
				'use strict';

				var widgetMixin = {
					#{2:_create}: function () {
						$0
						return this._super();
					}
				};

				return function (targetWidget) {
					$.widget('#{1:mage.modal}', targetWidget, widgetMixin);
					return $.#{1:mage.modal};
				};
			});
		`)
	},
	"mixin: función": {
		prefix: "ac-mixin-function",
		descricao: "Mixin de un módulo que devuelve una función: la envuelve con mage/utils/wrapper.",
		pagina: MIXINS,
		body: corpo(String.raw`
			define([
				'mage/utils/wrapper'
			], function (wrapper) {
				'use strict';

				return function (#{1:targetFunction}) {
					return wrapper.wrap(#{1:targetFunction}, function (original#{2:Function}) {
						var args = Array.prototype.slice.call(arguments, 1);
						$0
						return original#{2:Function}.apply(this, args);
					});
				};
			});
		`)
	}
};

const GRAPHQL = "commerce-webapi/src/pages/graphql/develop/index.md";

/** @type {Record<string, Snippet>} */
const SNIPPETS_GRAPHQL = {
	"schema.graphqls: query": {
		prefix: "ac-graphql-query",
		descricao: "etc/schema.graphqls: una query nueva con su resolver y su tipo de salida.",
		pagina: GRAPHQL,
		body: corpo(String.raw`
			type Query {
				#{1:example}(#{2:id}: #{3:Int!}): #{4:ExampleOutput} @resolver(class: "\\#{5:Vendor\\Module\\Model\\Resolver\\Example}") @doc(description: "#{6:Returns an example}")
			}

			type #{4:ExampleOutput} {
				#{7:name}: String @doc(description: "#{8:The name}")
			}
		`)
	},
	"schema.graphqls: mutation": {
		prefix: "ac-graphql-mutation",
		descricao: "Una mutation con un input propio y su resolver.",
		pagina: "commerce-webapi/src/pages/graphql/develop/resolvers.md",
		body: corpo(String.raw`
			type Mutation {
				#{1:createExample}(input: #{2:CreateExampleInput!}): #{3:ExampleOutput} @resolver(class: "\\#{4:Vendor\\Module\\Model\\Resolver\\CreateExample}") @doc(description: "#{5:Creates an example}")
			}

			input #{2:CreateExampleInput} {
				#{6:name}: String! @doc(description: "#{7:The name}")
			}
		`)
	},
	"schema.graphqls: extender un tipo": {
		prefix: "ac-graphql-extend",
		descricao: "Agrega un campo a un tipo o interfaz existente (se fusiona con el schema.graphqls del módulo original).",
		pagina: "commerce-webapi/src/pages/graphql/develop/extend-existing-schema.md",
		body: corpo(String.raw`
			interface #{1:ProductInterface} {
				#{2:example_field}: #{3:String} @doc(description: "#{4:An example field}") @resolver(class: "\\#{5:Vendor\\Module\\Model\\Resolver\\ExampleField}")
			}
		`)
	}
};

module.exports = { SNIPPETS_PHTML, SNIPPETS_JS, SNIPPETS_GRAPHQL };
