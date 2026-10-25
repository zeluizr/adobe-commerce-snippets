// @ts-check
"use strict";

// Snippets de PHP do Adobe Commerce, escritos à mão a partir da documentação da
// Adobe (Apache-2.0); `pagina` diz de onde veio cada um. Os corpos usam
// String.raw para as barras de namespace saírem como são (ver lib/corpo.js).
// Lógica pura, sem `vscode`.

const { corpo } = require("./corpo");

/** @typedef {import("./snippets-xml").Snippet} Snippet */

/** @type {Record<string, Snippet>} */
const SNIPPETS_PHP = {
	"registration.php": {
		prefix: "ac-registration",
		descricao: "registration.php: registra el módulo en el ComponentRegistrar.",
		pagina: "commerce-php/src/pages/development/build/component-registration.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			use Magento\Framework\Component\ComponentRegistrar;

			ComponentRegistrar::register(ComponentRegistrar::MODULE, '#{1:Vendor}_#{2:Module}', __DIR__);
		`)
	},
	"plugin: clase": {
		prefix: "ac-plugin",
		descricao: "Clase de plugin con un método after. Se declara en di.xml con <plugin>.",
		pagina: "commerce-php/src/pages/development/components/plugins.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\Plugin;

			use #{3:Magento\Catalog\Model\Product};

			class #{4:ProductPlugin}
			{
				public function after#{5:GetName}(#{6:Product} $subject, $result)
				{
					$0
					return $result;
				}
			}
		`)
	},
	"plugin: before": {
		prefix: "ac-plugin-before",
		descricao: "Método before: recibe los argumentos y devuelve un array con los nuevos, o null para no cambiarlos.",
		pagina: "commerce-php/src/pages/development/components/plugins.md",
		body: corpo(String.raw`
			public function before#{1:SetName}(#{2:Product} $subject, $#{3:name})
			{
				$0
				return [$#{3:name}];
			}
		`)
	},
	"plugin: after": {
		prefix: "ac-plugin-after",
		descricao: "Método after: recibe el resultado del original (y sus argumentos) y devuelve el resultado.",
		pagina: "commerce-php/src/pages/development/components/plugins.md",
		body: corpo(String.raw`
			public function after#{1:GetName}(#{2:Product} $subject, $result)
			{
				$0
				return $result;
			}
		`)
	},
	"plugin: around": {
		prefix: "ac-plugin-around",
		descricao: "Método around: llama a $proceed para ejecutar el original. Úsalo solo si hace falta cortar la ejecución; si no, before o after.",
		pagina: "commerce-php/src/pages/development/components/plugins.md",
		body: corpo(String.raw`
			public function around#{1:Save}(#{2:Product} $subject, callable $proceed, ...$args)
			{
				$0
				return $proceed(...$args);
			}
		`)
	},
	"observer": {
		prefix: "ac-observer",
		descricao: "Observer: implementa ObserverInterface. Se declara en events.xml.",
		pagina: "commerce-php/src/pages/development/components/events-and-observers/index.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\Observer;

			use Magento\Framework\Event\Observer;
			use Magento\Framework\Event\ObserverInterface;

			class #{3:Example} implements ObserverInterface
			{
				public function execute(Observer $observer)
				{
					$#{4:product} = $observer->getEvent()->getData('#{4:product}');
					$0
				}
			}
		`)
	},
	"controller frontend": {
		prefix: "ac-controller",
		descricao: "Controller del frontend para GET que devuelve una página (Controller/<Carpeta>/<Acción>.php).",
		pagina: "commerce-php/src/pages/development/components/routing.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\Controller\#{3:Index};

			use Magento\Framework\App\Action\HttpGetActionInterface;
			use Magento\Framework\View\Result\Page;
			use Magento\Framework\View\Result\PageFactory;

			class #{4:Index} implements HttpGetActionInterface
			{
				public function __construct(
					private readonly PageFactory $pageFactory
				) {
				}

				public function execute(): Page
				{
					$0
					return $this->pageFactory->create();
				}
			}
		`)
	},
	"controller frontend JSON": {
		prefix: "ac-controller-json",
		descricao: "Controller del frontend para POST que responde JSON. El formulario envía el form_key.",
		pagina: "commerce-php/src/pages/development/components/routing.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\Controller\#{3:Index};

			use Magento\Framework\App\Action\HttpPostActionInterface;
			use Magento\Framework\App\RequestInterface;
			use Magento\Framework\Controller\Result\Json;
			use Magento\Framework\Controller\Result\JsonFactory;

			class #{4:Save} implements HttpPostActionInterface
			{
				public function __construct(
					private readonly RequestInterface $request,
					private readonly JsonFactory $jsonFactory
				) {
				}

				public function execute(): Json
				{
					$0
					return $this->jsonFactory->create()->setData(['success' => true]);
				}
			}
		`)
	},
	"controller adminhtml": {
		prefix: "ac-controller-admin",
		descricao: "Controller del Admin: extiende Magento\\Backend\\App\\Action y define ADMIN_RESOURCE con el recurso de acl.xml.",
		pagina: "commerce-php/src/pages/development/security/authorization.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\Controller\Adminhtml\#{3:Example};

			use Magento\Backend\App\Action;
			use Magento\Backend\App\Action\Context;
			use Magento\Framework\App\Action\HttpGetActionInterface;
			use Magento\Framework\View\Result\Page;
			use Magento\Framework\View\Result\PageFactory;

			class #{4:Index} extends Action implements HttpGetActionInterface
			{
				public const ADMIN_RESOURCE = '#{1:Vendor}_#{2:Module}::#{5:example}';

				public function __construct(
					Context $context,
					private readonly PageFactory $pageFactory
				) {
					parent::__construct($context);
				}

				public function execute(): Page
				{
					$page = $this->pageFactory->create();
					$page->getConfig()->getTitle()->prepend(__('#{6:Example}'));
					$0
					return $page;
				}
			}
		`)
	},
	"ViewModel": {
		prefix: "ac-viewmodel",
		descricao: "ViewModel: implementa ArgumentInterface y se pasa al bloque en el argumento view_model del layout.",
		pagina: "commerce-php/src/pages/development/components/view-models.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\ViewModel;

			use Magento\Framework\View\Element\Block\ArgumentInterface;

			class #{3:Example} implements ArgumentInterface
			{
				public function #{4:getTitle}(): string
				{
					$0
					return '';
				}
			}
		`)
	},
	"data patch": {
		prefix: "ac-data-patch",
		descricao: "Data patch (Setup/Patch/Data): se aplica una sola vez con setup:upgrade.",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/patches.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\Setup\Patch\Data;

			use Magento\Framework\Setup\ModuleDataSetupInterface;
			use Magento\Framework\Setup\Patch\DataPatchInterface;

			class #{3:AddExampleData} implements DataPatchInterface
			{
				public function __construct(
					private readonly ModuleDataSetupInterface $moduleDataSetup
				) {
				}

				public function apply(): self
				{
					$this->moduleDataSetup->getConnection()->startSetup();
					$0
					$this->moduleDataSetup->getConnection()->endSetup();
					return $this;
				}

				public static function getDependencies(): array
				{
					return [];
				}

				public function getAliases(): array
				{
					return [];
				}
			}
		`)
	},
	"schema patch": {
		prefix: "ac-schema-patch",
		descricao: "Schema patch (Setup/Patch/Schema): cambios de esquema que db_schema.xml no expresa.",
		pagina: "commerce-php/src/pages/development/components/declarative-schema/patches.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\Setup\Patch\Schema;

			use Magento\Framework\Setup\Patch\SchemaPatchInterface;
			use Magento\Framework\Setup\SchemaSetupInterface;

			class #{3:ExampleSchemaChange} implements SchemaPatchInterface
			{
				public function __construct(
					private readonly SchemaSetupInterface $schemaSetup
				) {
				}

				public function apply(): self
				{
					$this->schemaSetup->startSetup();
					$0
					$this->schemaSetup->endSetup();
					return $this;
				}

				public static function getDependencies(): array
				{
					return [];
				}

				public function getAliases(): array
				{
					return [];
				}
			}
		`)
	},
	"cron job": {
		prefix: "ac-cron",
		descricao: "Clase de un cron job (Cron/). El método se declara en crontab.xml.",
		pagina: "commerce-operations.en/help/configuration/cron/custom-cron-tutorial.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\Cron;

			use Psr\Log\LoggerInterface;

			class #{3:Example}
			{
				public function __construct(
					private readonly LoggerInterface $logger
				) {
				}

				public function execute(): void
				{
					$0
				}
			}
		`)
	},
	"consumer": {
		prefix: "ac-consumer",
		descricao: "Consumer de la cola de mensajes: el handler de queue_consumer.xml recibe el mensaje del topic.",
		pagina: "commerce-php/src/pages/development/components/message-queues/configuration.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\Model;

			use Psr\Log\LoggerInterface;

			class #{3:Consumer}
			{
				public function __construct(
					private readonly LoggerInterface $logger
				) {
				}

				public function #{4:process}(#{5:string} $message): void
				{
					$0
				}
			}
		`)
	},
	"resolver GraphQL": {
		prefix: "ac-resolver",
		descricao: "Resolver de GraphQL: implementa ResolverInterface y se asocia al campo con @resolver en schema.graphqls.",
		pagina: "commerce-webapi/src/pages/graphql/develop/resolvers.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\Model\Resolver;

			use Magento\Framework\GraphQl\Config\Element\Field;
			use Magento\Framework\GraphQl\Query\ResolverInterface;
			use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;

			class #{3:Example} implements ResolverInterface
			{
				public function resolve(Field $field, $context, ResolveInfo $info, ?array $value = null, ?array $args = null)
				{
					$0
					return [];
				}
			}
		`)
	},
	"service contract": {
		prefix: "ac-service-contract",
		descricao: "Interfaz de repositorio en Api/ (service contract) con @api, para exponer en webapi.xml.",
		pagina: "commerce-php/src/pages/development/components/service-contracts/design-patterns.md",
		body: corpo(String.raw`
			<?php

			declare(strict_types=1);

			namespace #{1:Vendor}\#{2:Module}\Api;

			use Magento\Framework\Api\SearchCriteriaInterface;
			use Magento\Framework\Exception\NoSuchEntityException;

			/**
			 * @api
			 */
			interface #{3:Example}RepositoryInterface
			{
				/**
				 * @param int $id
				 * @return \#{1:Vendor}\#{2:Module}\Api\Data\#{3:Example}Interface
				 * @throws NoSuchEntityException
				 */
				public function getById(int $id);

				/**
				 * @param SearchCriteriaInterface $searchCriteria
				 * @return \#{1:Vendor}\#{2:Module}\Api\Data\#{3:Example}SearchResultsInterface
				 */
				public function getList(SearchCriteriaInterface $searchCriteria);
			}
		`)
	}
};

module.exports = { SNIPPETS_PHP };
