# CLAUDE.md

Guia para trabalhar neste repositório. É a extensão de VS Code **"Adobe Commerce Snippets"** (publisher
`commenteme`, id `commenteme.adobe-commerce-snippets`). Irmã do `shopify-snippets` e do `vtex-io-snippets`, para o
desenvolvimento PHP do Adobe Commerce (Magento Open Source e Adobe Commerce).

## O que a extensão faz

1. **Validação XSD em vivo** dos XML que declaram `xsi:noNamespaceSchemaLocation="urn:magento:..."`, ao abrir, ao
   salvar e ao digitar (400 ms de espera). Lógica em `lib/validador.js`, resolução de URN em `lib/urn.js`, descoberta
   dos componentes em `lib/componentes.js`, mensagens em espanhol em `lib/mensagens.js`; `extension.js` só liga ao
   editor. O validador é o libxml2 em WebAssembly (`libxml2-wasm`, ESM, carregado por `import()`), com um input
   provider que resolve as URN dos `xs:include`/`xs:redefine` dentro dos XSD.
2. **Snippets** escritos à mão em `lib/snippets-xml.js`, `lib/snippets-php.js` e `lib/snippets-front.js` (phtml,
   RequireJS, GraphQL), juntados em `lib/catalogo.js`. Cada um tem `pagina`: o caminho da página de documentação de
   onde veio, que vira a URL da descrição (`lib/fontes.js` com `data/fonte.json`).

Não traz gramática: associa `.phtml` a `php` e `.graphqls` a `graphql` e convive com as extensões de linguagem.

## Licenças (regra dura)

O `magento/magento2` é OSL-3.0, XSD incluídos, e **não entra neste repositório nem no `.vsix`** (MIT). A validação lê
os XSD do projeto aberto. Os testes baixam os XSD de uma tag do magento2 para `os.tmpdir()` (ou
`ADOBE_COMMERCE_XSD_CACHE`) com `scripts/baixar-xsd-teste.js`; nunca os commite. As XSD de `test/fixtures/` são
escritas aqui. Os snippets são adaptados da documentação da Adobe (Apache-2.0 e MIT), nunca copiados do magento2.

## Regras que os testes cobram

- **Sem XSD, sem diagnóstico.** Raiz, componente ou include que não resolve: nenhum problema, só o motivo no output
  channel. Nunca um falso positivo.
- **Nenhum falso positivo nos 2.414 XML do core** (layout do clone, tag 2.4.9). `ADOBE_COMMERCE_PROJETO=/caminho node
  --test` faz o mesmo num projeto real; rode antes de mexer em `lib/validador.js` ou `lib/componentes.js`.
- **Todo snippet de XML é válido contra o XSD oficial** (inteiro ou dentro do `envoltorio`), todo de JavaScript compila,
  e os de PHP, phtml e GraphQL fecham parênteses e chaves.
- **Os arquivos de `snippets/` são gerados**: nunca edite à mão. Mude `lib/` e rode `node scripts/gerar.js`; o CI falha
  se o gerado divergir do commitado.
- **Toda página citada existe** no commit fixado: `ADOBE_COMMERCE_DOCS=/pasta/dos/clones node --test`.
- **O README lista todo prefixo.** Snippet novo entra na tabela.

## Resolução de URN

`urn:magento:module:Vendor_Module:<caminho>` → pasta do módulo registrado com esse nome;
`urn:magento:framework:<caminho>` → biblioteca `magento/framework`; `urn:magento:framework-<x>:<caminho>` → biblioteca
`magento/framework-<x>`. Os registros vêm de `vendor/composer/autoload_files.php`, `app/code/*/*/registration.php` e
`lib/internal/Magento/Framework[/*]/registration.php`. O caminho resolvido nunca sai da pasta do componente e sempre
termina em `.xsd`. Fonte: commerce-php `development/build/schema-validation.md` e `component-registration.md`.

## Convenções

- JavaScript puro, CommonJS, sem build step. Todo arquivo começa com `// @ts-check` e `"use strict"`.
- Estilo: tab (largura 2), aspas duplas e ponto e vírgula.
- `lib/*.js` é lógica sem `vscode`, testável com `node:test`. Só o `extension.js` importa `vscode`.
- Corpos de snippet se escrevem com `corpo()` (`lib/corpo.js`): `#{1:x}` é campo, `$0` é tabstop, todo outro `$` é
  literal; em PHP use `String.raw` para as barras de namespace.
- Comentários e mensagens de commit em português; README, CHANGELOG, descrições de snippets e mensagens de
  diagnóstico em espanhol.
- Dependência de runtime só `libxml2-wasm`. O `.vsix` vai com ela (sem `--no-dependencies`).
- Prefixos `ac-`, únicos.

## Marca

Segue o kit de marca da commente.me (skill `marca-commente`): o ícone é o **ladrillo de produto para devs**
(`images/icon.svg`, montado pela regra do kit v7, que ainda não traz este SVG: o de snippets com o destaque trocado): destaque em laranja Adobe Commerce `#F26322` e glifo `</>` no quarto bloco; o banner do Marketplace é a cor da plataforma (`#F26322`, laranja Adobe Commerce) com texto escuro (`theme: light`), e o ícone tem o raio do ladrillo (`rx="22"`), o nome não leva "by commente.me" e
o README assina "Hecho con amor y café por commente.me", sem citar ferramenta de IA e sem travessão. Sempre
«Adobe Commerce»; «Magento» só entre parênteses na primeira menção técnica; nunca «Adobe» sozinho para a plataforma.

## Comandos

```bash
npm install
npm run check          # gera, confere o diff de snippets/ e roda os testes (é o gate)
npm run xsd-teste      # baixa os XSD do magento2 para a pasta temporária dos testes
npm run empacotar      # gera o .vsix
npm run icone          # images/icon.png a partir de images/icon.svg (sharp)
npm run preview        # images/preview.png, a partir dos snippets e do validador reais
```

## Branches e versão

`branch de trabalho` → PR contra `dev` → `qa` → `main`, sempre por merge da branch inteira. O workflow `ramas` cobra
que `qa` só tenha o que está em `dev` e que o commit de `main` tenha **tag anotada de versão**. Uma tag `v*` dispara o
`publish.yml`, que só anexa o `.vsix` à Release; o Marketplace é manual (`vsce publish`), e só com o OK do usuário.
