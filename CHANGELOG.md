# Changelog

Todos los cambios de adobe-commerce-snippets. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
las versiones siguen [SemVer](https://semver.org/lang/es/).

## [Sin publicar]

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
