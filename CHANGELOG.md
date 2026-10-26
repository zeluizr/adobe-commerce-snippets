# Changelog

Todos los cambios de adobe-commerce-snippets. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
las versiones siguen [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

### Agregado

- Snippets `ac-menu` y `ac-menu-add` (`etc/adminhtml/menu.xml`), `ac-extension-attributes`
  (`etc/extension_attributes.xml`), `ac-csp-whitelist` (`etc/csp_whitelist.xml`), `ac-di-command` (un comando de
  consola en el `CommandList` del `di.xml`) y `ac-console-command` (la clase del comando).

### Corregido

- Los módulos cuyo `registration.php` lleva una coma después de `__DIR__` (el estilo PER-CS 2.0 en llamadas de
  varias líneas) no se reconocían, y sus XML quedaban sin validar.
- Un `xsi:type` inválido se informa como `xsi:type`, no como `{http://www.w3.org/2001/XMLSchema-instance}type`, y el
  subrayado cae en el atributo y no en la etiqueta. Ya no se agrega el error de «tipo abstracto» que solo repetía el
  mismo problema, ni los «Internal error» del propio libxml2, que no hablan del XML.

### Cambiado

- Un `composer install` o un `git checkout` que cambian cientos de `registration.php` releen los componentes y
  revalidan los XML abiertos una sola vez, cuando terminan, y no una vez por archivo.

## [0.1.3] - 2026-10-26

### Cambiado

- El nombre visible pasa a ser «Snippets for Adobe Commerce», el mismo patrón que Snippets for VTEX IO. El identificador no
  cambia: quien ya la tiene instalada no pierde nada.

## [0.1.2] - 2026-10-26

### Cambiado

- El ícono tiene las esquinas redondeadas, con el radio del ladrillo, porque el Marketplace no las redondea.
- La cabecera del Marketplace va en el color de la plataforma, con texto oscuro, y el badge de versión del README
  también.

## [0.1.1] - 2026-10-26

### Cambiado

- Nuevo ícono de producto para devs del kit de marca v7: el ladrillo de commente.me con el destaque en el naranja de
  Adobe Commerce y el glifo `</>` de snippets.
- El README sigue el mismo formato que el de VTEX IO Snippets y el de Shopify Snippets, con los badges de versión,
  instalaciones y licencia.

## [0.1.0] - 2026-10-25

### Agregado

- Validación en vivo de los XML que declaran un esquema `urn:magento:...` contra los XSD del propio proyecto
  (`vendor/` o `app/code/`), al abrir, al guardar y mientras escribes. Resuelve las URN de módulo, de framework y de
  `framework-<subnombre>`, también dentro de los `xs:include` y `xs:redefine` de los XSD. Sin XSD, no hay
  diagnóstico. Se apaga con `adobeCommerceSnippets.validarXml`.
- Los errores en español y en el lugar exacto: el atributo, la etiqueta o la línea.
- 44 snippets de XML (módulo, `di.xml`, eventos, rutas, Web API, ACL, configuración, cron, `db_schema.xml`, colas,
  indexers y layout), 16 de PHP, 6 de templates `.phtml` con el `$escaper` por contexto, 7 de RequireJS y mixins y
  3 de `schema.graphqls`. Cada uno cita la página de la documentación de la que salió.
- Ícono de la extensión (el ladrillo de commente.me) y color del banner del Marketplace.
