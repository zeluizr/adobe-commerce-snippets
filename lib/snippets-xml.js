// @ts-check
"use strict";

// Snippets de XML de módulo e de layout, escritos à mão a partir da documentação
// da Adobe (Apache-2.0). Cada um diz em `pagina` de que página veio, no
// repositório e no commit de data/fonte.json; nada é copiado do magento2.
//
// Os testes resolvem cada corpo com os valores padrão e validam o resultado
// contra os XSD do magento2 baixados para uma pasta temporária: o arquivo
// inteiro, quando o snippet é um arquivo (`urn` no próprio corpo), ou dentro do
// `envoltorio` indicado, quando é um trecho. Lógica pura, sem `vscode`.

const { corpo } = require("./corpo");

const XSI = 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"';

/**
 * Raiz de um arquivo de configuração com a URN do esquema.
 * @param {string} urn
 * @param {string} raiz
 * @param {string} [extra] atributos a mais na raiz
 */
const abrir = (urn, raiz = "config", extra = "") => `<${raiz} ${XSI}${extra} xsi:noNamespaceSchemaLocation="${urn}">`;

const URN = {
	module: "urn:magento:framework:Module/etc/module.xsd",
	di: "urn:magento:framework:ObjectManager/etc/config.xsd",
	events: "urn:magento:framework:Event/etc/events.xsd",
	routes: "urn:magento:framework:App/etc/routes.xsd",
	webapi: "urn:magento:module:Magento_Webapi:etc/webapi.xsd",
	acl: "urn:magento:framework:Acl/etc/acl.xsd",
	menu: "urn:magento:module:Magento_Backend:etc/menu.xsd",
	extensionAttributes: "urn:magento:framework:Api/etc/extension_attributes.xsd",
	csp: "urn:magento:module:Magento_Csp:etc/csp_whitelist.xsd",
	system: "urn:magento:module:Magento_Config:etc/system_file.xsd",
	config: "urn:magento:module:Magento_Store:etc/config.xsd",
	crontab: "urn:magento:module:Magento_Cron:etc/crontab.xsd",
	dbSchema: "urn:magento:framework:Setup/Declaration/Schema/etc/schema.xsd",
	communication: "urn:magento:framework:Communication/etc/communication.xsd",
	consumer: "urn:magento:framework-message-queue:etc/consumer.xsd",
	publisher: "urn:magento:framework-message-queue:etc/publisher.xsd",
	topology: "urn:magento:framework-message-queue:etc/topology.xsd",
	indexer: "urn:magento:framework:Indexer/etc/indexer.xsd",
	mview: "urn:magento:framework:Mview/etc/mview.xsd",
	layout: "urn:magento:framework:View/Layout/etc/page_configuration.xsd"
};

/**
 * Onde um trecho é encaixado para ser validado.
 * @type {Record<string, (trecho: string) => string>}
 */
const ENVOLTORIOS = {
	module: (t) => `<?xml version="1.0"?>\n${abrir(URN.module)}\n<module name="Vendor_Module">\n${t}\n</module>\n</config>\n`,
	di: (t) => `<?xml version="1.0"?>\n${abrir(URN.di)}\n${t}\n</config>\n`,
	diArguments: (t) => `<?xml version="1.0"?>\n${abrir(URN.di)}\n<type name="Vendor\\Module\\Model\\Exemplo">\n<arguments>\n${t}\n</arguments>\n</type>\n</config>\n`,
	menu: (t) => `<?xml version="1.0"?>\n${abrir(URN.menu)}\n<menu>\n${t}\n</menu>\n</config>\n`,
	events: (t) => `<?xml version="1.0"?>\n${abrir(URN.events)}\n${t}\n</config>\n`,
	webapi: (t) => `<?xml version="1.0"?>\n${abrir(URN.webapi, "routes")}\n${t}\n</routes>\n`,
	systemGroup: (t) =>
		`<?xml version="1.0"?>\n${abrir(URN.system)}\n<system>\n<section id="exemplo">\n<group id="general">\n${t}\n</group>\n</section>\n</system>\n</config>\n`,
	crontab: (t) => `<?xml version="1.0"?>\n${abrir(URN.crontab)}\n${t}\n</config>\n`,
	dbSchema: (t) => `<?xml version="1.0"?>\n${abrir(URN.dbSchema, "schema")}\n${t}\n</schema>\n`,
	dbTable: (t) =>
		`<?xml version="1.0"?>\n${abrir(URN.dbSchema, "schema")}\n<table name="vendor_module_exemplo" resource="default" engine="innodb" comment="Exemplo">\n${t}\n</table>\n</schema>\n`,
	layoutBody: (t) => `<?xml version="1.0"?>\n${abrir(URN.layout, "page")}\n<body>\n${t}\n</body>\n</page>\n`
};

/**
 * @typedef {{ prefix: string, body: string[], descricao: string, pagina: string, envoltorio?: string }} Snippet
 */

/** @type {Record<string, Snippet>} */
const SNIPPETS_XML = {
	"module.xml": {
		prefix: "ac-module",
		descricao: "etc/module.xml: declara el módulo y, si hace falta, el orden de carga con <sequence>.",
		pagina: "commerce-php/src/pages/development/build/component-name.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.module)}
				<module name="#{1:Vendor}_#{2:Module}">
					<sequence>
						<module name="#{3:Magento_Catalog}"/>
					</sequence>
				</module>
			</config>
		`)
	},
	"module.xml: sequence": {
		prefix: "ac-module-sequence",
		descricao: "<sequence>: módulos que deben cargarse antes que este.",
		pagina: "commerce-php/src/pages/architecture/modules/dependencies.md",
		envoltorio: "module",
		body: corpo(`
			<sequence>
				<module name="#{1:Magento_Catalog}"/>
			</sequence>
		`)
	},
	"di.xml": {
		prefix: "ac-di",
		descricao: "etc/di.xml vacío, listo para preferencias, tipos y plugins.",
		pagina: "commerce-php/src/pages/development/build/dependency-injection-file.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.di)}
				$0
			</config>
		`)
	},
	"di.xml: preference": {
		prefix: "ac-di-preference",
		descricao: "<preference>: la implementación que el Object Manager entrega para una interfaz o clase.",
		pagina: "commerce-php/src/pages/development/build/dependency-injection-file.md",
		envoltorio: "di",
		body: corpo(`
			<preference for="#{1:Vendor\\Module\\Api\\ExampleInterface}" type="#{2:Vendor\\Module\\Model\\Example}"/>
		`)
	},
	"di.xml: type con arguments": {
		prefix: "ac-di-type",
		descricao: "<type> con <arguments>: cambia un argumento del constructor de una clase.",
		pagina: "commerce-php/src/pages/development/build/dependency-injection-file.md",
		envoltorio: "di",
		body: corpo(`
			<type name="#{1:Vendor\\Module\\Model\\Example}">
				<arguments>
					<argument name="#{2:nombre}" xsi:type="#{3|string,object,boolean,number,const,init_parameter|}">#{4:valor}</argument>
				</arguments>
			</type>
		`)
	},
	"di.xml: argument array": {
		prefix: "ac-di-array",
		descricao: "<argument> de tipo array con <item>.",
		pagina: "commerce-php/src/pages/development/build/dependency-injection-file.md",
		envoltorio: "diArguments",
		body: corpo(`
			<argument name="#{1:items}" xsi:type="array">
				<item name="#{2:clave}" xsi:type="#{3|string,object,boolean,number,const|}">#{4:valor}</item>
			</argument>
		`)
	},
	"di.xml: comando de consola": {
		prefix: "ac-di-command",
		descricao: "Registra un comando de consola de bin/magento en el argumento commands de Magento\\Framework\\Console\\CommandList.",
		pagina: "commerce-php/src/pages/development/cli-commands/custom.md",
		envoltorio: "di",
		body: corpo(`
			<type name="Magento\\Framework\\Console\\CommandList">
				<arguments>
					<argument name="commands" xsi:type="array">
						<item name="#{1:vendor_module_example}" xsi:type="object">#{2:Vendor\\Module\\Console\\Command\\Example}</item>
					</argument>
				</arguments>
			</type>
		`)
	},
	"di.xml: virtualType": {
		prefix: "ac-di-virtualtype",
		descricao: "<virtualType>: una variante de una clase con otros argumentos, sin escribir una clase nueva.",
		pagina: "commerce-php/src/pages/development/build/dependency-injection-file.md",
		envoltorio: "di",
		body: corpo(`
			<virtualType name="#{1:Vendor\\Module\\Model\\VirtualExample}" type="#{2:Vendor\\Module\\Model\\Example}">
				<arguments>
					<argument name="#{3:nombre}" xsi:type="#{4|string,object,boolean,number,const|}">#{5:valor}</argument>
				</arguments>
			</virtualType>
		`)
	},
	"di.xml: plugin": {
		prefix: "ac-di-plugin",
		descricao: "<plugin> sobre una clase: intercepta sus métodos públicos con before, after o around.",
		pagina: "commerce-php/src/pages/development/components/plugins.md",
		envoltorio: "di",
		body: corpo(`
			<type name="#{1:Magento\\Catalog\\Model\\Product}">
				<plugin name="#{2:vendor_module_product}" type="#{3:Vendor\\Module\\Plugin\\ProductPlugin}" sortOrder="#{4:10}" disabled="false"/>
			</type>
		`)
	},
	"events.xml": {
		prefix: "ac-events",
		descricao: "etc/events.xml con un observer. En etc/frontend/ o etc/adminhtml/ vale solo para esa área.",
		pagina: "commerce-php/src/pages/development/components/events-and-observers/index.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.events)}
				<event name="#{1:catalog_product_save_after}">
					<observer name="#{2:vendor_module_observer}" instance="#{3:Vendor\\Module\\Observer\\Example}"/>
				</event>
			</config>
		`)
	},
	"events.xml: event": {
		prefix: "ac-event",
		descricao: "<event> con <observer>.",
		pagina: "commerce-php/src/pages/development/components/events-and-observers/index.md",
		envoltorio: "events",
		body: corpo(`
			<event name="#{1:catalog_product_save_after}">
				<observer name="#{2:vendor_module_observer}" instance="#{3:Vendor\\Module\\Observer\\Example}"/>
			</event>
		`)
	},
	"routes.xml (frontend)": {
		prefix: "ac-routes",
		descricao: "etc/frontend/routes.xml: el router standard con el frontName del módulo.",
		pagina: "commerce-php/src/pages/development/components/routing.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.routes)}
				<router id="standard">
					<route id="#{1:example}" frontName="#{2:example}">
						<module name="#{3:Vendor_Module}"/>
					</route>
				</router>
			</config>
		`)
	},
	"routes.xml (adminhtml)": {
		prefix: "ac-routes-admin",
		descricao: "etc/adminhtml/routes.xml: el router admin, con el módulo antes de Magento_Backend.",
		pagina: "commerce-php/src/pages/development/components/routing.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.routes)}
				<router id="admin">
					<route id="#{1:example}" frontName="#{2:example}">
						<module name="#{3:Vendor_Module}" before="Magento_Backend"/>
					</route>
				</router>
			</config>
		`)
	},
	"webapi.xml": {
		prefix: "ac-webapi",
		descricao: "etc/webapi.xml: una ruta REST hacia un método de un service contract, con su recurso de ACL.",
		pagina: "commerce-php/src/pages/development/components/web-api/services.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.webapi, "routes")}
				<route url="/V1/#{1:example}/:id" method="#{2|GET,POST,PUT,DELETE|}">
					<service class="#{3:Vendor\\Module\\Api\\ExampleRepositoryInterface}" method="#{4:getById}"/>
					<resources>
						<resource ref="#{5:Vendor_Module::example}"/>
					</resources>
				</route>
			</routes>
		`)
	},
	"webapi.xml: route": {
		prefix: "ac-webapi-route",
		descricao: "<route> de la Web API. ref anonymous es público, self es el cliente autenticado.",
		pagina: "commerce-php/src/pages/development/security/authorization.md",
		envoltorio: "webapi",
		body: corpo(`
			<route url="/V1/#{1:example}" method="#{2|GET,POST,PUT,DELETE|}">
				<service class="#{3:Vendor\\Module\\Api\\ExampleRepositoryInterface}" method="#{4:getList}"/>
				<resources>
					<resource ref="#{5|Vendor_Module::example,self,anonymous|}"/>
				</resources>
			</route>
		`)
	},
	"acl.xml": {
		prefix: "ac-acl",
		descricao: "etc/acl.xml: recursos de ACL bajo Magento_Backend::admin.",
		pagina: "commerce-php/src/pages/tutorials/backend/create-access-control-list-rule.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.acl)}
				<acl>
					<resources>
						<resource id="Magento_Backend::admin">
							<resource id="#{1:Vendor_Module}::#{2:example}" title="#{3:Example}" sortOrder="#{4:10}"/>
						</resource>
					</resources>
				</acl>
			</config>
		`)
	},
	"menu.xml": {
		prefix: "ac-menu",
		descricao: "etc/adminhtml/menu.xml: una entrada del menú del Admin que abre una ruta, protegida por un recurso de acl.xml.",
		pagina: "commerce-php/src/pages/tutorials/admin/create-admin-page.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.menu)}
				<menu>
					<add id="#{1:Vendor_Module}::#{2:example}" title="#{3:Example}" translate="title" module="#{1:Vendor_Module}" parent="#{4:Magento_Backend::content}" sortOrder="#{5:50}" action="#{6:example/index}" resource="#{1:Vendor_Module}::#{2:example}"/>
				</menu>
			</config>
		`)
	},
	"menu.xml: add": {
		prefix: "ac-menu-add",
		descricao: "<add>: un ítem del menú del Admin. Sin action es un grupo; el resource es el de acl.xml.",
		pagina: "commerce-php/src/pages/tutorials/admin/create-admin-page.md",
		envoltorio: "menu",
		body: corpo(`
			<add id="#{1:Vendor_Module}::#{2:example}" title="#{3:Example}" translate="title" module="#{1:Vendor_Module}" parent="#{4:Magento_Backend::content}" sortOrder="#{5:10}" action="#{6:example/index}" resource="#{1:Vendor_Module}::#{2:example}"/>
		`)
	},
	"system.xml": {
		prefix: "ac-system",
		descricao: "etc/adminhtml/system.xml: sección, grupo y campo de configuración en Stores > Configuration.",
		pagina: "commerce-operations.en/help/configuration/reference/config-reference-systemxml.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.system)}
				<system>
					<section id="#{1:vendor_module}" translate="label" sortOrder="#{2:100}" showInDefault="1" showInWebsite="1" showInStore="1">
						<label>#{3:Example}</label>
						<tab>#{4:general}</tab>
						<resource>#{5:Vendor_Module::config}</resource>
						<group id="#{6:general}" translate="label" sortOrder="10" showInDefault="1" showInWebsite="1" showInStore="1">
							<label>#{7:General}</label>
							<field id="#{8:enabled}" translate="label" type="select" sortOrder="10" showInDefault="1" showInWebsite="1" showInStore="1">
								<label>#{9:Enabled}</label>
								<source_model>Magento\\Config\\Model\\Config\\Source\\Yesno</source_model>
							</field>
						</group>
					</section>
				</system>
			</config>
		`)
	},
	"system.xml: field": {
		prefix: "ac-system-field",
		descricao: "<field> de configuración dentro de un <group>.",
		pagina: "commerce-operations.en/help/configuration/reference/config-reference-systemxml.md",
		envoltorio: "systemGroup",
		body: corpo(`
			<field id="#{1:example}" translate="label" type="#{2|text,select,multiselect,textarea,obscure|}" sortOrder="#{3:10}" showInDefault="1" showInWebsite="1" showInStore="1">
				<label>#{4:Example}</label>
			</field>
		`)
	},
	"config.xml": {
		prefix: "ac-config",
		descricao: "etc/config.xml: valores por defecto de la configuración (section/group/field).",
		pagina: "commerce-operations.en/help/configuration/reference/module-files.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.config)}
				<default>
					<#{1:vendor_module}>
						<#{2:general}>
							<#{3:enabled}>#{4:1}</#{3:enabled}>
						</#{2:general}>
					</#{1:vendor_module}>
				</default>
			</config>
		`)
	},
	"extension_attributes.xml": {
		prefix: "ac-extension-attributes",
		descricao: "etc/extension_attributes.xml: agrega un atributo de extensión a la interfaz de datos de un service contract.",
		pagina: "commerce-php/src/pages/development/components/attributes.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.extensionAttributes)}
				<extension_attributes for="#{1:Magento\\Sales\\Api\\Data\\OrderInterface}">
					<attribute code="#{2:example}" type="#{3:string}"/>
				</extension_attributes>
			</config>
		`)
	},
	"csp_whitelist.xml": {
		prefix: "ac-csp-whitelist",
		descricao: "etc/csp_whitelist.xml: autoriza un host en una directiva de la Content Security Policy.",
		pagina: "commerce-php/src/pages/development/security/content-security-policies.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.csp, "csp_whitelist")}
				<policies>
					<policy id="#{1|script-src,connect-src,img-src,style-src,font-src,frame-src,media-src,form-action|}">
						<values>
							<value id="#{2:example}" type="host">#{3:https://example.com}</value>
						</values>
					</policy>
				</policies>
			</csp_whitelist>
		`)
	},
	"crontab.xml": {
		prefix: "ac-crontab",
		descricao: "etc/crontab.xml: un job en el grupo default con su expresión cron.",
		pagina: "commerce-operations.en/help/configuration/cron/custom-cron-reference.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.crontab)}
				<group id="#{1:default}">
					<job name="#{2:vendor_module_example}" instance="#{3:Vendor\\Module\\Cron\\Example}" method="#{4:execute}">
						<schedule>#{5:* * * * *}</schedule>
					</job>
				</group>
			</config>
		`)
	},
	"crontab.xml: job": {
		prefix: "ac-cron-job",
		descricao: "<group> con un <job>. config_path en lugar de schedule lee la expresión de la configuración.",
		pagina: "commerce-operations.en/help/configuration/cron/custom-cron-tutorial.md",
		envoltorio: "crontab",
		body: corpo(`
			<group id="#{1:default}">
				<job name="#{2:vendor_module_example}" instance="#{3:Vendor\\Module\\Cron\\Example}" method="execute">
					<schedule>#{4:0 * * * *}</schedule>
				</job>
			</group>
		`)
	},
	"db_schema.xml": {
		prefix: "ac-db-schema",
		descricao: "etc/db_schema.xml: una tabla con clave primaria autoincremental. Genera el whitelist con setup:db-declaration:generate-whitelist.",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/configuration.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.dbSchema, "schema")}
				<table name="#{1:vendor_module_example}" resource="default" engine="innodb" comment="#{2:Example}">
					<column xsi:type="int" name="#{3:entity_id}" unsigned="true" nullable="false" identity="true" comment="#{4:Entity ID}"/>
					$0
					<constraint xsi:type="primary" referenceId="PRIMARY">
						<column name="#{3:entity_id}"/>
					</constraint>
				</table>
			</schema>
		`)
	},
	"db_schema.xml: table": {
		prefix: "ac-db-table",
		descricao: "<table> con clave primaria.",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/configuration.md",
		envoltorio: "dbSchema",
		body: corpo(`
			<table name="#{1:vendor_module_example}" resource="default" engine="innodb" comment="#{2:Example}">
				<column xsi:type="int" name="#{3:entity_id}" unsigned="true" nullable="false" identity="true" comment="#{4:Entity ID}"/>
				<constraint xsi:type="primary" referenceId="PRIMARY">
					<column name="#{3:entity_id}"/>
				</constraint>
			</table>
		`)
	},
	"db_schema.xml: column int": {
		prefix: "ac-db-int",
		descricao: "<column> entera (int, smallint, bigint, tinyint).",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/configuration.md",
		envoltorio: "dbTable",
		body: corpo(`
			<column xsi:type="#{1|int,smallint,bigint,tinyint|}" name="#{2:example_id}" unsigned="true" nullable="#{3|false,true|}" identity="false" default="#{4:0}" comment="#{5:Example ID}"/>
		`)
	},
	"db_schema.xml: column varchar": {
		prefix: "ac-db-varchar",
		descricao: "<column> varchar con length.",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/configuration.md",
		envoltorio: "dbTable",
		body: corpo(`
			<column xsi:type="varchar" name="#{1:title}" nullable="#{2|false,true|}" length="#{3:255}" comment="#{4:Title}"/>
		`)
	},
	"db_schema.xml: column text": {
		prefix: "ac-db-text",
		descricao: "<column> de texto largo (text, mediumtext, longtext).",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/configuration.md",
		envoltorio: "dbTable",
		body: corpo(`
			<column xsi:type="#{1|text,mediumtext,longtext|}" name="#{2:content}" nullable="true" comment="#{3:Content}"/>
		`)
	},
	"db_schema.xml: column decimal": {
		prefix: "ac-db-decimal",
		descricao: "<column> decimal con precision y scale.",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/configuration.md",
		envoltorio: "dbTable",
		body: corpo(`
			<column xsi:type="decimal" name="#{1:amount}" scale="#{2:4}" precision="#{3:20}" unsigned="false" nullable="false" default="0" comment="#{4:Amount}"/>
		`)
	},
	"db_schema.xml: column timestamp": {
		prefix: "ac-db-timestamp",
		descricao: "<column> timestamp con CURRENT_TIMESTAMP; on_update=\"true\" la actualiza en cada cambio.",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/configuration.md",
		envoltorio: "dbTable",
		body: corpo(`
			<column xsi:type="timestamp" name="#{1:created_at}" on_update="#{2|false,true|}" nullable="false" default="CURRENT_TIMESTAMP" comment="#{3:Created At}"/>
		`)
	},
	"db_schema.xml: column boolean": {
		prefix: "ac-db-boolean",
		descricao: "<column> boolean.",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/configuration.md",
		envoltorio: "dbTable",
		body: corpo(`
			<column xsi:type="boolean" name="#{1:is_active}" nullable="false" default="#{2|true,false|}" comment="#{3:Is Active}"/>
		`)
	},
	"db_schema.xml: index": {
		prefix: "ac-db-index",
		descricao: "<index> btree o fulltext sobre una o más columnas.",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/configuration.md",
		envoltorio: "dbTable",
		body: corpo(`
			<index referenceId="#{1:VENDOR_MODULE_EXAMPLE_TITLE}" indexType="#{2|btree,fulltext,hash|}">
				<column name="#{3:title}"/>
			</index>
		`)
	},
	"db_schema.xml: unique": {
		prefix: "ac-db-unique",
		descricao: "<constraint> unique.",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/configuration.md",
		envoltorio: "dbTable",
		body: corpo(`
			<constraint xsi:type="unique" referenceId="#{1:VENDOR_MODULE_EXAMPLE_CODE}">
				<column name="#{2:code}"/>
			</constraint>
		`)
	},
	"db_schema.xml: foreign": {
		prefix: "ac-db-foreign",
		descricao: "<constraint> foreign hacia otra tabla.",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/configuration.md",
		envoltorio: "dbTable",
		body: corpo(`
			<constraint xsi:type="foreign" referenceId="#{1:VENDOR_MODULE_EXAMPLE_STORE_ID_STORE_STORE_ID}" table="#{2:vendor_module_example}" column="#{3:store_id}" referenceTable="#{4:store}" referenceColumn="#{5:store_id}" onDelete="#{6|CASCADE,SET NULL,NO ACTION|}"/>
		`)
	},
	"communication.xml": {
		prefix: "ac-communication",
		descricao: "etc/communication.xml: declara un topic de la cola de mensajes y el tipo del mensaje.",
		pagina: "commerce-php/src/pages/development/components/message-queues/configuration.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.communication)}
				<topic name="#{1:vendor.module.example}" request="#{2:string}"/>
			</config>
		`)
	},
	"queue_consumer.xml": {
		prefix: "ac-queue-consumer",
		descricao: "etc/queue_consumer.xml: el consumer de una cola y el método que procesa cada mensaje.",
		pagina: "commerce-php/src/pages/development/components/message-queues/configuration.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.consumer)}
				<consumer name="#{1:vendor.module.example}" queue="#{2:vendor.module.example}" connection="#{3|db,amqp,stomp|}" handler="#{4:Vendor\\Module\\Model\\Consumer}::#{5:process}"/>
			</config>
		`)
	},
	"queue_publisher.xml": {
		prefix: "ac-queue-publisher",
		descricao: "etc/queue_publisher.xml: por qué conexión y exchange sale un topic.",
		pagina: "commerce-php/src/pages/development/components/message-queues/configuration.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.publisher)}
				<publisher topic="#{1:vendor.module.example}">
					<connection name="#{2|db,amqp,stomp|}" exchange="#{3:magento-db}"/>
				</publisher>
			</config>
		`)
	},
	"queue_topology.xml": {
		prefix: "ac-queue-topology",
		descricao: "etc/queue_topology.xml: el exchange y el binding del topic hacia la cola.",
		pagina: "commerce-php/src/pages/development/components/message-queues/configuration.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.topology)}
				<exchange name="#{1:magento-db}" type="topic" connection="#{2|db,amqp,stomp|}">
					<binding id="#{3:vendorModuleExampleBinding}" topic="#{4:vendor.module.example}" destinationType="queue" destination="#{5:vendor.module.example}"/>
				</exchange>
			</config>
		`)
	},
	"indexer.xml": {
		prefix: "ac-indexer",
		descricao: "etc/indexer.xml: un indexer propio, con la vista de mview que lo alimenta.",
		pagina: "commerce-php/src/pages/development/components/indexing/custom-indexer.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.indexer)}
				<indexer id="#{1:vendor_module_example}" view_id="#{2:vendor_module_example}" class="#{3:Vendor\\Module\\Model\\Indexer\\Example}">
					<title translate="true">#{4:Example}</title>
					<description translate="true">#{5:Example indexer}</description>
				</indexer>
			</config>
		`)
	},
	"mview.xml": {
		prefix: "ac-mview",
		descricao: "etc/mview.xml: la vista y las tablas que disparan la reindexación en modo programado.",
		pagina: "commerce-php/src/pages/development/components/indexing/custom-indexer.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.mview)}
				<view id="#{1:vendor_module_example}" class="#{2:Vendor\\Module\\Model\\Indexer\\Example}" group="indexer">
					<subscriptions>
						<table name="#{3:catalog_product_entity}" entity_column="#{4:entity_id}"/>
					</subscriptions>
				</view>
			</config>
		`)
	},
	"layout: page": {
		prefix: "ac-layout",
		descricao: "Archivo de layout (view/<área>/layout/<handle>.xml) con <body>.",
		pagina: "commerce-frontend-core/src/pages/guide/layouts/types.md",
		body: corpo(`
			<?xml version="1.0"?>
			${abrir(URN.layout, "page")}
				<body>
					$0
				</body>
			</page>
		`)
	},
	"layout: referenceBlock": {
		prefix: "ac-layout-referenceblock",
		descricao: "<referenceBlock>: modifica un bloque existente (argumentos, template, display).",
		pagina: "commerce-frontend-core/src/pages/guide/layouts/xml-instructions.md",
		envoltorio: "layoutBody",
		body: corpo(`
			<referenceBlock name="#{1:product.info.main}">
				$0
			</referenceBlock>
		`)
	},
	"layout: referenceContainer": {
		prefix: "ac-layout-referencecontainer",
		descricao: "<referenceContainer>: agrega bloques o cambia atributos de un contenedor existente.",
		pagina: "commerce-frontend-core/src/pages/guide/layouts/xml-instructions.md",
		envoltorio: "layoutBody",
		body: corpo(`
			<referenceContainer name="#{1:content}">
				$0
			</referenceContainer>
		`)
	},
	"layout: block con ViewModel": {
		prefix: "ac-layout-block",
		descricao: "<block> con template y un ViewModel en el argumento view_model.",
		pagina: "commerce-php/src/pages/development/components/view-models.md",
		envoltorio: "layoutBody",
		body: corpo(`
			<block class="Magento\\Framework\\View\\Element\\Template" name="#{1:vendor.module.example}" template="#{2:Vendor_Module}::#{3:example.phtml}">
				<arguments>
					<argument name="view_model" xsi:type="object">#{4:Vendor\\Module\\ViewModel\\Example}</argument>
				</arguments>
			</block>
		`)
	},
	"layout: container": {
		prefix: "ac-layout-container",
		descricao: "<container> con etiqueta HTML y clase.",
		pagina: "commerce-frontend-core/src/pages/guide/layouts/xml-instructions.md",
		envoltorio: "layoutBody",
		body: corpo(`
			<container name="#{1:vendor.module.container}" htmlTag="#{2:div}" htmlClass="#{3:example}">
				$0
			</container>
		`)
	},
	"layout: move": {
		prefix: "ac-layout-move",
		descricao: "<move>: lleva un bloque o contenedor a otro padre, antes o después de un hermano.",
		pagina: "commerce-frontend-core/src/pages/guide/layouts/xml-instructions.md",
		envoltorio: "layoutBody",
		body: corpo(`
			<move element="#{1:product.info.sku}" destination="#{2:product.info.main}" #{3|after,before|}="#{4:-}"/>
		`)
	},
	"layout: remove": {
		prefix: "ac-layout-remove",
		descricao: "Quita un bloque o contenedor del layout con remove=\"true\".",
		pagina: "commerce-frontend-core/src/pages/guide/layouts/xml-instructions.md",
		envoltorio: "layoutBody",
		body: corpo(`
			<#{1|referenceBlock,referenceContainer|} name="#{2:catalog.compare.sidebar}" remove="true"/>
		`)
	}
};

module.exports = { SNIPPETS_XML, ENVOLTORIOS, URN };
